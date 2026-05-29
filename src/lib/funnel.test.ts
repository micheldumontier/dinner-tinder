import { describe, expect, it } from "vitest";
import type { Member, Session, Swipe } from "../api/types";
import {
  candidateRecipeIds,
  currentMember,
  finalResultIds,
  hasFinishedTurn,
  isComplete,
  likedRecipeIds,
  recipeOutcomes,
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

describe("recipeOutcomes", () => {
  const completed = makeSession({
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

  it("reports one outcome per deck recipe, in deck order", () => {
    expect(recipeOutcomes(completed).map((o) => o.recipeId)).toEqual([
      "r1",
      "r2",
      "r3",
      "r4",
    ]);
  });

  it("marks the survivor that everyone liked", () => {
    const r1 = recipeOutcomes(completed).find((o) => o.recipeId === "r1")!;
    expect(r1.survived).toBe(true);
    expect(r1.likes).toBe(3);
    expect(r1.seenBy).toBe(3);
    expect(r1.eliminatedByMemberId).toBeNull();
  });

  it("records who knocked out a recipe and stops counting after", () => {
    // r2: liked by a and b, rejected by c (turn 2).
    const r2 = recipeOutcomes(completed).find((o) => o.recipeId === "r2")!;
    expect(r2.survived).toBe(false);
    expect(r2.likes).toBe(2);
    expect(r2.seenBy).toBe(3);
    expect(r2.eliminatedByMemberId).toBe("c");
    expect(r2.eliminatedAtOrder).toBe(2);

    // r3: liked by a, rejected by b (turn 1); c never saw it.
    const r3 = recipeOutcomes(completed).find((o) => o.recipeId === "r3")!;
    expect(r3.likes).toBe(1);
    expect(r3.seenBy).toBe(2);
    expect(r3.eliminatedByMemberId).toBe("b");

    // r4: rejected by a (turn 0) right away.
    const r4 = recipeOutcomes(completed).find((o) => o.recipeId === "r4")!;
    expect(r4.likes).toBe(0);
    expect(r4.seenBy).toBe(1);
    expect(r4.eliminatedAtOrder).toBe(0);
  });

  it("the survivors exactly match finalResultIds", () => {
    const survivors = recipeOutcomes(completed)
      .filter((o) => o.survived)
      .map((o) => o.recipeId);
    expect(survivors).toEqual(finalResultIds(completed));
  });

  it("marks nothing as survived while the game is still in progress", () => {
    const inProgress = makeSession({
      currentTurnIndex: 1,
      swipes: swipes(["a", "r1", true], ["a", "r2", false], ["a", "r3", true], ["a", "r4", true]),
    });
    expect(recipeOutcomes(inProgress).every((o) => !o.survived)).toBe(true);
  });
});
