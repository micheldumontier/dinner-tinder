import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { Member, Session } from "../src/api/types";
import { createServer } from "./index";

let server: Server;
let base: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = createServer().listen(0, resolve);
  });
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return (await res.json()) as T;
}

describe("HTTP backend", () => {
  it("runs a full create → join → start → swipe → results flow", async () => {
    const created = await post<{ session: Session; member: Member }>("/api/sessions", {
      hostName: "Ann",
    });
    const code = created.session.code;
    const ann = created.member;

    const joined = await post<{ session: Session; member: Member }>(
      `/api/sessions/${code}/join`,
      { name: "Bob" },
    );
    const bob = joined.member;
    expect(joined.session.members).toHaveLength(2);

    await post(`/api/sessions/${code}/start`, { recipeIds: ["r1", "r2", "r3"] });

    await post(`/api/sessions/${code}/swipe`, { memberId: ann.id, recipeId: "r1", liked: true });
    await post(`/api/sessions/${code}/swipe`, { memberId: ann.id, recipeId: "r2", liked: false });
    const afterAnn = await post<Session>(`/api/sessions/${code}/swipe`, {
      memberId: ann.id,
      recipeId: "r3",
      liked: true,
    });
    expect(afterAnn.currentTurnIndex).toBe(1);

    // Bob narrows Ann's picks [r1, r3].
    await post(`/api/sessions/${code}/swipe`, { memberId: bob.id, recipeId: "r1", liked: true });
    const final = await post<Session>(`/api/sessions/${code}/swipe`, {
      memberId: bob.id,
      recipeId: "r3",
      liked: false,
    });
    expect(final.phase).toBe("results");
  });

  it("returns 404 for a missing session", async () => {
    const res = await fetch(`${base}/api/sessions/ZZZZ/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nobody" }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/No session found/);
  });

  it("pushes live updates to SSE subscribers", async () => {
    const created = await post<{ session: Session }>("/api/sessions", { hostName: "Ann" });
    const code = created.session.code;

    const controller = new AbortController();
    const res = await fetch(`${base}/api/sessions/${code}/events`, {
      signal: controller.signal,
    });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    // Trigger a state change for subscribers to receive.
    await post(`/api/sessions/${code}/join`, { name: "Bob" });

    let buffer = "";
    let sawBob = false;
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && !sawBob) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      for (const line of buffer.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        try {
          const session = JSON.parse(line.slice(6)) as Session;
          if (session.members.some((m) => m.name === "Bob")) sawBob = true;
        } catch {
          /* partial frame; keep reading */
        }
      }
    }

    controller.abort();
    expect(sawBob).toBe(true);
  });
});
