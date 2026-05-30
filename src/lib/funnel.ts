// Pure logic for the concurrent "everyone swipes at once" dinner picker.
//
// The rules:
//   - Once the host starts, every party member sees the full preloaded deck.
//   - Each person's personal queue is the deck minus the recipes *they* have
//     already swiped on. Late joiners catch up by seeing the same full deck.
//   - Each queue is ordered so recipes others have already voted on come first
//     (in deck order), followed by recipes nobody has voted on yet — this lets
//     selections by anybody be prioritised to people who haven't voted on them.
//   - A round ends when the host hits "End" (or, optionally, when every member
//     has swiped on every recipe). The winners are the recipes that received
//     at least one like and zero dislikes — i.e. nobody who voted on it said no.
//
// All functions here are pure and deterministic so they can be unit-tested
// without any backend, DOM, or storage involvement.

import type { Member, Session, Swipe } from "../api/types";

/** Members sorted into their join order (ascending `order`). */
export function orderedMembers(session: Session): Member[] {
  return [...session.members].sort((a, b) => a.order - b.order);
}

/** Recipe ids a given member swiped right on, preserving deck order. */
export function likedRecipeIds(session: Session, memberId: string): string[] {
  const liked = new Set(
    session.swipes
      .filter((s: Swipe) => s.memberId === memberId && s.liked)
      .map((s) => s.recipeId),
  );
  return session.recipeIds.filter((id) => liked.has(id));
}

/**
 * The recipes a given member should still swipe on, in priority order.
 *
 * Order: recipes that other members have already voted on come first (deck
 * order within that group), then recipes nobody has voted on yet (deck order).
 * This pushes a fresh vote toward people who haven't seen it, so the party
 * converges on consensus faster.
 */
export function candidateRecipeIds(session: Session, memberId: string): string[] {
  const mySwiped = new Set(
    session.swipes.filter((s) => s.memberId === memberId).map((s) => s.recipeId),
  );
  const votedByOthers = new Set(
    session.swipes
      .filter((s) => s.memberId !== memberId)
      .map((s) => s.recipeId),
  );

  const remaining = session.recipeIds.filter((id) => !mySwiped.has(id));
  const prioritised = remaining.filter((id) => votedByOthers.has(id));
  const fresh = remaining.filter((id) => !votedByOthers.has(id));
  return [...prioritised, ...fresh];
}

/** Has the given member voted on every recipe in the deck? */
export function hasFinishedSwiping(session: Session, member: Member): boolean {
  const swiped = new Set(
    session.swipes.filter((s) => s.memberId === member.id).map((s) => s.recipeId),
  );
  return session.recipeIds.every((id) => swiped.has(id));
}

/** True once the session has moved to the results phase. */
export function isComplete(session: Session): boolean {
  return session.phase === "results";
}

/**
 * Winning recipes: ones at least one member liked and nobody who voted on
 * them rejected. Sorted by like count (desc), ties broken by original deck
 * order. Returns an empty array if no recipes qualify.
 */
export function finalResultIds(session: Session): string[] {
  if (!isComplete(session) || session.members.length === 0) {
    return [];
  }

  const counts = countsByRecipe(session);
  return session.recipeIds.filter((id) => {
    const c = counts.get(id);
    return c !== undefined && c.likes > 0 && c.dislikes === 0;
  }).sort((a, b) => {
    const la = counts.get(a)?.likes ?? 0;
    const lb = counts.get(b)?.likes ?? 0;
    if (la !== lb) return lb - la;
    return session.recipeIds.indexOf(a) - session.recipeIds.indexOf(b);
  });
}

interface RecipeCounts {
  likes: number;
  dislikes: number;
}

function countsByRecipe(session: Session): Map<string, RecipeCounts> {
  const counts = new Map<string, RecipeCounts>();
  for (const id of session.recipeIds) counts.set(id, { likes: 0, dislikes: 0 });
  for (const s of session.swipes) {
    const c = counts.get(s.recipeId);
    if (!c) continue;
    if (s.liked) c.likes += 1;
    else c.dislikes += 1;
  }
  return counts;
}

/** A per-recipe summary of how it fared this round. */
export interface RecipeOutcome {
  recipeId: string;
  /** Members who swiped right on it. */
  likes: number;
  /** Members who swiped left on it. */
  dislikes: number;
  /** Members who haven't swiped on it at all. */
  notVoted: number;
  /** True if it survived (at least one like, no dislikes). */
  survived: boolean;
}

/**
 * Per-recipe breakdown: like / dislike / not-voted counts and whether it
 * survived (no dislikes and at least one like).
 */
export function recipeOutcomes(session: Session): RecipeOutcome[] {
  const memberCount = session.members.length;
  const counts = countsByRecipe(session);
  return session.recipeIds.map((recipeId) => {
    const c = counts.get(recipeId) ?? { likes: 0, dislikes: 0 };
    const votes = c.likes + c.dislikes;
    return {
      recipeId,
      likes: c.likes,
      dislikes: c.dislikes,
      notVoted: Math.max(0, memberCount - votes),
      survived: c.likes > 0 && c.dislikes === 0,
    };
  });
}
