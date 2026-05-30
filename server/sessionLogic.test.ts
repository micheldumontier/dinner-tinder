import { describe, expect, it } from "vitest";
import type { Session } from "../src/api/types";
import {
  SessionError,
  createSession,
  endSession,
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
    let calls = 0;
    const exists = (_code: string) => {
      calls++;
      return calls === 1; // pretend the first generated code is taken once
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

  it("lets late joiners in while a round is being swiped", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1", "r2"]);
    const cara = joinSession(session, "Cara");
    expect(cara.order).toBe(2);
    expect(cara.status).toBe("active"); // can start swiping immediately
    expect(session.members).toHaveLength(3);
  });

  it("rejects joining once the session has finished", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1"]);
    endSession(session);
    expect(() => joinSession(session, "Cara")).toThrow(/already finished/);
  });
});

describe("startSwiping", () => {
  it("locks the deck and makes every member active", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1", "r2"]);
    expect(session.phase).toBe("swiping");
    expect(session.recipeIds).toEqual(["r1", "r2"]);
    expect(session.members.every((m) => m.status === "active")).toBe(true);
  });

  it("rejects an empty deck", () => {
    const session = partyOfTwo();
    expect(() => startSwiping(session, [])).toThrow(/No recipes/);
  });
});

describe("submitSwipe (concurrent)", () => {
  it("marks a member done once they've voted on every recipe", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1", "r2"]);
    const [ann] = session.members;

    submitSwipe(session, ann.id, "r1", true);
    expect(session.members[0].status).toBe("active");
    submitSwipe(session, ann.id, "r2", false);
    expect(session.members[0].status).toBe("done");
    // Bob isn't done — session stays in swiping.
    expect(session.phase).toBe("swiping");
  });

  it("auto-ends the round once every member is done", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1", "r2"]);
    const [ann, bob] = session.members;
    submitSwipe(session, ann.id, "r1", true);
    submitSwipe(session, ann.id, "r2", true);
    submitSwipe(session, bob.id, "r1", true);
    submitSwipe(session, bob.id, "r2", false);
    expect(session.phase).toBe("results");
    expect(session.members.every((m) => m.status === "done")).toBe(true);
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

  it("rejects swipes once the session has ended", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1"]);
    endSession(session);
    expect(() =>
      submitSwipe(session, session.members[0].id, "r1", true),
    ).toThrow(/isn't accepting swipes/);
  });
});

describe("endSession", () => {
  it("flips a swiping session to results and marks everyone done", () => {
    const session = partyOfTwo();
    startSwiping(session, ["r1", "r2", "r3"]);
    submitSwipe(session, session.members[0].id, "r1", true);
    endSession(session);
    expect(session.phase).toBe("results");
    expect(session.members.every((m) => m.status === "done")).toBe(true);
  });

  it("is a no-op when called outside the swiping phase", () => {
    const session = partyOfTwo(); // still in lobby
    endSession(session);
    expect(session.phase).toBe("lobby");
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
