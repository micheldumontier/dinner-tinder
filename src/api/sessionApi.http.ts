// Real backend adapter: talks to the DinnerMatch server (see server/) over
// REST for actions and Server-Sent Events for live updates. This is selected
// automatically when VITE_API_URL is set (see sessionApi.ts).
//
// It implements exactly the same surface as sessionApi.local.ts, so the UI and
// funnel logic don't change — only where the shared state lives does.

import type { Member, Session } from "./types";
import { SessionError, type SessionListener as Listener } from "./sessionApi.shared";

export { SessionError };

// VITE_API_URL=auto → derive base URL from the page host at runtime, swapping
// the port to the server's (default 8787). Lets one dev server serve both
// localhost (host browser) and LAN-IP (phone) clients without rebuilding.
const RAW = String(import.meta.env.VITE_API_URL ?? "");
const BASE = RAW === "auto"
  ? `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_API_PORT ?? "8787"}`
  : RAW.replace(/\/+$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new SessionError("Can't reach the server. Is it running?");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new SessionError(data.error ?? `Request failed (${res.status}).`);
  }
  return data as T;
}

export async function createSession(
  hostName: string,
): Promise<{ session: Session; member: Member }> {
  return request("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ hostName }),
  });
}

export async function joinSession(
  code: string,
  memberName: string,
): Promise<{ session: Session; member: Member }> {
  return request(`/api/sessions/${encodeURIComponent(code.trim().toUpperCase())}/join`, {
    method: "POST",
    body: JSON.stringify({ name: memberName }),
  });
}

export async function getSession(code: string): Promise<Session> {
  return request(`/api/sessions/${encodeURIComponent(code)}`);
}

export async function startSwiping(code: string, recipeIds: string[]): Promise<Session> {
  return request(`/api/sessions/${encodeURIComponent(code)}/start`, {
    method: "POST",
    body: JSON.stringify({ recipeIds }),
  });
}

export async function submitSwipe(
  code: string,
  memberId: string,
  recipeId: string,
  liked: boolean,
): Promise<Session> {
  return request(`/api/sessions/${encodeURIComponent(code)}/swipe`, {
    method: "POST",
    body: JSON.stringify({ memberId, recipeId, liked }),
  });
}

export async function endSession(code: string): Promise<Session> {
  return request(`/api/sessions/${encodeURIComponent(code)}/end`, { method: "POST" });
}

export async function playAgain(code: string): Promise<Session> {
  return request(`/api/sessions/${encodeURIComponent(code)}/again`, { method: "POST" });
}

/** Live updates via Server-Sent Events; EventSource auto-reconnects. */
export function subscribe(code: string, onChange: Listener): () => void {
  const source = new EventSource(`${BASE}/api/sessions/${encodeURIComponent(code)}/events`);
  source.onmessage = (event) => {
    try {
      onChange(JSON.parse(event.data) as Session);
    } catch {
      /* ignore malformed payloads */
    }
  };
  return () => source.close();
}
