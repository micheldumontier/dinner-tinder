import { describe, expect, it } from "vitest";
import type { Session } from "../src/api/types";
import {
  SessionError,
  createSession,
  joinSession,
  playAgain,
  startSwiping,
  submitSwipe,
} from "./sessionLogic";

const never = () => false;

function partyOfTwo(): Session {
  const { session } = createSession("Ann", never);
  joinSession(session, "Bob");
  return session;
}

describe("createSession", () => {
  it("creates a lobby with the host as member 0", () => {
    const { session, member } = createSession("Ann", never);
    expect(session.phase).toBe("lobby");
    expect(session.hostId).toBe(member.id);
    expect(session.members).toHaveLength(1);
    expect(session.code).toHaveLength(4);
  });

  it("rejects a blank name", () => {
    expect(() => createSession("  ", never)).toThrow(SessionError);
  });

  it("avoids code collisions", () => {
    const taken = new Set(["AAAA"]);
    let calls = 0;
    const exists = (code: string) => {
      calls++;
      // Pretend the first generated code is taken once.
      return calls === 1 ? true : taken.has(code);
    };
    const { session } = createSession("Ann", exists);
    expect(session.code).toHaveLength(4);
    expect(calls).toBeGreaterThan(1);
  });
});

describe("joinSession", () => {
  it("adds members in join order", () => {
    const { session } = createSession("Ann", never);
    const bob = joinSession(session, "Bob");
    expect(bob.order).toBe(1);
    expect(session.members.map((m) => m.name)).toEqual(["Ann", "Bob"]);
  });

  it("rejects duplicate names case-insensitively", () => {
    const session = partyOfTwo();
    expect(() => joinSession(session, "bob")).toThrow(/already in this party/);
  });

  it("rejects joining once swiping has started", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1"]);
    expect(() => joinSession(session, "Cara")).toThrow(/already started/);
  });
});

describe("startSwiping", () => {
  it("locks the deck and activates the first member", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1", "r2"]);
    expect(session.phase).toBe("swiping");
    expect(session.recipeIds).toEqual(["r1", "r2"]);
    expect(session.members[0].status).toBe("active");
    expect(session.members[1].status).toBe("waiting");
  });

  it("rejects an empty deck", () => {
    const session = partyOfTwo();
    expect(() => startSwiping(session, [])).toThrow(/No recipes/);
  });
});

describe("submitSwipe + turn advancement", () => {
  it("advances to the next member once the active one finishes", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1", "r2"]);
    const [ann, bob] = session.members;

    submitSwipe(session, ann.id, "r1", true);
    expect(session.currentTurnIndex).toBe(0); // not done yet
    submitSwipe(session, ann.id, "r2", false);

    expect(session.currentTurnIndex).toBe(1);
    expect(session.members[0].status).toBe("done");
    expect(session.members[1].status).toBe("active");
    expect(bob.status).toBe("active");
  });

  it("reaches results after the last member swipes their candidates", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1", "r2"]);
    const [ann, bob] = session.members;
    submitSwipe(session, ann.id, "r1", true);
    submitSwipe(session, ann.id, "r2", true);
    // Bob now narrows [r1, r2]
    submitSwipe(session, bob.id, "r1", true);
    submitSwipe(session, bob.id, "r2", false);
    expect(session.phase).toBe("results");
  });

  it("treats re-swipes as idempotent updates", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1"]);
    const ann = session.members[0];
    submitSwipe(session, ann.id, "r1", false);
    submitSwipe(session, ann.id, "r1", true);
    expect(session.swipes.filter((s) => s.recipeId === "r1")).toHaveLength(1);
    expect(session.swipes[0].liked).toBe(true);
  });

  it("rejects swipes from an unknown member", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1"]);
    expect(() => submitSwipe(session, "ghost", "r1", true)).toThrow(/Unknown member/);
  });
});

describe("playAgain", () => {
  it("resets the session back to a fresh lobby", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1"]);
    submitSwipe(session, session.members[0].id, "r1", true);
    playAgain(session);
    expect(session.phase).toBe("lobby");
    expect(session.swipes).toEqual([]);
    expect(session.recipeIds).toEqual([]);
    expect(session.members.every((m) => m.status === "waiting")).toBe(true);
  });
});
