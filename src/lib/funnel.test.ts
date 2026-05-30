import { describe, expect, it } from "vitest";
import type { Member, Session, Swipe } from "../api/types";
import {
  candidateRecipeIds,
  finalResultIds,
  hasFinishedSwiping,
  isComplete,
  likedRecipeIds,
  recipeOutcomes,
} from "./funnel";

function member(id: string, order: number, status: Member["status"] = "active"): Member {
  return { id, name: id, order, status };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    code: "TEST",
    hostId: "a",
    phase: "swiping",
    members: [member("a", 0), member("b", 1), member("c", 2)],
    recipeIds: ["r1", "r2", "r3", "r4"],
    swipes: [],
    createdAt: 0,
    ...overrides,
  };
}

function swipes(...entries: [string, string, boolean][]): Swipe[] {
  return entries.map(([memberId, recipeId, liked]) => ({ memberId, recipeId, liked }));
}

describe("candidateRecipeIds", () => {
  it("gives a fresh member the full deck in original order", () => {
    const s = makeSession();
    expect(candidateRecipeIds(s, "a")).toEqual(["r1", "r2", "r3", "r4"]);
  });

  it("omits recipes the member has already voted on", () => {
    const s = makeSession({
      swipes: swipes(["a", "r1", true], ["a", "r3", false]),
    });
    expect(candidateRecipeIds(s, "a")).toEqual(["r2", "r4"]);
  });

  it("prioritises recipes others have voted on but I haven't", () => {
    // b has voted on r3; a hasn't voted on anything. r3 should jump to the
    // front of a's queue ahead of r1/r2/r4 (which nobody has touched).
    const s = makeSession({
      swipes: swipes(["b", "r3", true]),
    });
    expect(candidateRecipeIds(s, "a")).toEqual(["r3", "r1", "r2", "r4"]);
  });

  it("keeps deck order within both priority groups", () => {
    // b liked r4 and r2; a hasn't voted on anything. Both r2 and r4 are
    // prioritised, but they should appear in deck order (r2 before r4).
    const s = makeSession({
      swipes: swipes(["b", "r4", true], ["b", "r2", false]),
    });
    expect(candidateRecipeIds(s, "a")).toEqual(["r2", "r4", "r1", "r3"]);
  });

  it("doesn't prioritise based on my own swipes", () => {
    const s = makeSession({
      swipes: swipes(["a", "r2", true]),
    });
    // r2 is voted on by me — it's filtered out, not promoted. Order is the
    // remaining deck order.
    expect(candidateRecipeIds(s, "a")).toEqual(["r1", "r3", "r4"]);
  });

  it("returns an empty queue once I've voted on every recipe", () => {
    const s = makeSession({
      swipes: swipes(
        ["a", "r1", true],
        ["a", "r2", false],
        ["a", "r3", true],
        ["a", "r4", false],
      ),
    });
    expect(candidateRecipeIds(s, "a")).toEqual([]);
  });
});

describe("hasFinishedSwiping", () => {
  it("is false until every recipe has been swiped", () => {
    const s = makeSession({ swipes: swipes(["a", "r1", true]) });
    expect(hasFinishedSwiping(s, s.members[0])).toBe(false);
  });

  it("is true once all deck recipes are swiped", () => {
    const s = makeSession({
      swipes: swipes(
        ["a", "r1", true],
        ["a", "r2", false],
        ["a", "r3", true],
        ["a", "r4", false],
      ),
    });
    expect(hasFinishedSwiping(s, s.members[0])).toBe(true);
  });
});

describe("isComplete", () => {
  it("is true once the session moves to results phase", () => {
    expect(isComplete(makeSession({ phase: "results" }))).toBe(true);
    expect(isComplete(makeSession({ phase: "swiping" }))).toBe(false);
    expect(isComplete(makeSession({ phase: "lobby" }))).toBe(false);
  });
});

describe("finalResultIds", () => {
  it("returns nothing before the session completes", () => {
    expect(finalResultIds(makeSession())).toEqual([]);
  });

  it("returns recipes with at least one like and no dislikes, by likes desc", () => {
    const s = makeSession({
      phase: "results",
      swipes: swipes(
        // r1: 3 likes, 0 dislikes — top winner
        ["a", "r1", true], ["b", "r1", true], ["c", "r1", true],
        // r2: 2 likes, 0 dislikes (c didn't vote) — winner, lower rank
        ["a", "r2", true], ["b", "r2", true],
        // r3: 2 likes, 1 dislike — out
        ["a", "r3", true], ["b", "r3", true], ["c", "r3", false],
        // r4: 0 votes — not a winner
      ),
    });
    expect(finalResultIds(s)).toEqual(["r1", "r2"]);
  });

  it("returns empty when every recipe has at least one dislike", () => {
    const s = makeSession({
      phase: "results",
      swipes: swipes(
        ["a", "r1", false], ["a", "r2", false], ["a", "r3", false], ["a", "r4", false],
      ),
    });
    expect(finalResultIds(s)).toEqual([]);
  });
});

describe("likedRecipeIds", () => {
  it("returns liked recipes in deck order", () => {
    const s = makeSession({
      swipes: swipes(["a", "r3", true], ["a", "r1", true], ["a", "r2", false]),
    });
    expect(likedRecipeIds(s, "a")).toEqual(["r1", "r3"]);
  });
});

describe("recipeOutcomes", () => {
  const completed = makeSession({
    phase: "results",
    swipes: swipes(
      ["a", "r1", true], ["b", "r1", true], ["c", "r1", true],
      ["a", "r2", true], ["b", "r2", true], ["c", "r2", false],
      ["a", "r3", false],
      // r4: nobody voted
    ),
  });

  it("reports one outcome per deck recipe, in deck order", () => {
    expect(recipeOutcomes(completed).map((o) => o.recipeId)).toEqual([
      "r1", "r2", "r3", "r4",
    ]);
  });

  it("flags survivors (likes > 0 and no dislikes)", () => {
    const byId = new Map(recipeOutcomes(completed).map((o) => [o.recipeId, o]));
    expect(byId.get("r1")?.survived).toBe(true);
    expect(byId.get("r2")?.survived).toBe(false); // one dislike
    expect(byId.get("r3")?.survived).toBe(false); // only dislikes
    expect(byId.get("r4")?.survived).toBe(false); // no votes at all
  });

  it("counts likes, dislikes, and members who didn't vote", () => {
    const byId = new Map(recipeOutcomes(completed).map((o) => [o.recipeId, o]));
    const r2 = byId.get("r2")!;
    expect(r2.likes).toBe(2);
    expect(r2.dislikes).toBe(1);
    expect(r2.notVoted).toBe(0);

    const r3 = byId.get("r3")!;
    expect(r3.likes).toBe(0);
    expect(r3.dislikes).toBe(1);
    expect(r3.notVoted).toBe(2);

    const r4 = byId.get("r4")!;
    expect(r4.likes).toBe(0);
    expect(r4.dislikes).toBe(0);
    expect(r4.notVoted).toBe(3);
  });

  it("survivors match finalResultIds", () => {
    const survivors = recipeOutcomes(completed)
      .filter((o) => o.survived)
      .map((o) => o.recipeId);
    expect(survivors).toEqual(finalResultIds(completed));
  });
});
