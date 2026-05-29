import { describe, expect, it } from "vitest";
import type { Member, Session, Swipe } from "../api/types";
import {
  candidateRecipeIds,
  currentMember,
  finalResultIds,
  hasFinishedTurn,
  isComplete,
  likedRecipeIds,
} from "./funnel";

function member(id: string, order: number): Member {
  return { id, name: id, order, status: "waiting" };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    code: "TEST",
    hostId: "a",
    phase: "swiping",
    members: [member("a", 0), member("b", 1), member("c", 2)],
    recipeIds: ["r1", "r2", "r3", "r4"],
    swipes: [],
    currentTurnIndex: 0,
    createdAt: 0,
    ...overrides,
  };
}

function swipes(...entries: [string, string, boolean][]): Swipe[] {
  return entries.map(([memberId, recipeId, liked]) => ({ memberId, recipeId, liked }));
}

describe("candidateRecipeIds", () => {
  it("gives the first member the full deck", () => {
    const s = makeSession();
    expect(candidateRecipeIds(s, 0)).toEqual(["r1", "r2", "r3", "r4"]);
  });

  it("gives later members only what the previous member liked", () => {
    const s = makeSession({
      swipes: swipes(
        ["a", "r1", true],
        ["a", "r2", false],
        ["a", "r3", true],
        ["a", "r4", false],
      ),
    });
    expect(candidateRecipeIds(s, 1)).toEqual(["r1", "r3"]);
  });

  it("preserves the original deck order in the narrowed set", () => {
    const s = makeSession({
      swipes: swipes(["a", "r4", true], ["a", "r1", true]),
    });
    // r1 comes before r4 in the deck regardless of swipe order
    expect(candidateRecipeIds(s, 1)).toEqual(["r1", "r4"]);
  });

  it("returns an empty set when the previous member rejected everything", () => {
    const s = makeSession({
      swipes: swipes(["a", "r1", false], ["a", "r2", false]),
    });
    expect(candidateRecipeIds(s, 1)).toEqual([]);
  });
});

describe("hasFinishedTurn", () => {
  it("is false until every candidate has been swiped", () => {
    const s = makeSession({ swipes: swipes(["a", "r1", true]) });
    expect(hasFinishedTurn(s, s.members[0])).toBe(false);
  });

  it("is true once all candidates are swiped", () => {
    const s = makeSession({
      swipes: swipes(
        ["a", "r1", true],
        ["a", "r2", false],
        ["a", "r3", true],
        ["a", "r4", false],
      ),
    });
    expect(hasFinishedTurn(s, s.members[0])).toBe(true);
  });

  it("only counts the candidate set, not the full deck, for later members", () => {
    const s = makeSession({
      currentTurnIndex: 1,
      swipes: swipes(
        ["a", "r1", true],
        ["a", "r2", true],
        ["a", "r3", false],
        ["a", "r4", false],
        ["b", "r1", true],
        ["b", "r2", false],
      ),
    });
    // b's candidate set is [r1, r2]; both swiped → finished
    expect(hasFinishedTurn(s, s.members[1])).toBe(true);
  });
});

describe("turn progression and results", () => {
  it("reports the current member by turn index", () => {
    const s = makeSession({ currentTurnIndex: 1 });
    expect(currentMember(s)?.id).toBe("b");
  });

  it("is complete once the turn index passes the last member", () => {
    expect(isComplete(makeSession({ currentTurnIndex: 3 }))).toBe(true);
    expect(isComplete(makeSession({ currentTurnIndex: 2 }))).toBe(false);
  });

  it("final result is the last member's liked set when complete", () => {
    const s = makeSession({
      phase: "results",
      currentTurnIndex: 3,
      swipes: swipes(
        ["a", "r1", true],
        ["a", "r2", true],
        ["a", "r3", true],
        ["a", "r4", false],
        ["b", "r1", true],
        ["b", "r2", true],
        ["b", "r3", false],
        ["c", "r1", true],
        ["c", "r2", false],
      ),
    });
    expect(finalResultIds(s)).toEqual(["r1"]);
  });

  it("returns no result when the funnel collapses to nothing", () => {
    const s = makeSession({
      phase: "results",
      currentTurnIndex: 3,
      swipes: swipes(["a", "r1", true], ["a", "r2", false], ["a", "r3", false], ["a", "r4", false]),
    });
    // b and c never liked anything (their candidate set started with [r1])
    expect(finalResultIds(s)).toEqual([]);
  });

  it("returns nothing before the game is complete", () => {
    expect(finalResultIds(makeSession({ currentTurnIndex: 1 }))).toEqual([]);
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
