// Pure funnel logic for the sequential "swipe to narrow down dinner" game.
//
// The rules (from the product brief):
//   - The first member to take their turn sees the full preloaded deck.
//   - Each subsequent member only sees the recipes the *previous* member
//     accepted (swiped right). The candidate set can only shrink.
//   - The final result is the set of recipes the last member accepted — i.e.
//     the recipes that survived every member's swipe in sequence.
//
// All functions here are pure and deterministic so they can be unit-tested
// without any backend, DOM, or storage involvement.

import type { Member, Session, Swipe } from "../api/types";

/** Members sorted into their turn order (ascending `order`). */
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
 * The set of recipes the member at `turnIndex` should swipe on.
 *
 * Turn 0 sees the whole deck; every later turn inherits the previous member's
 * accepted set. Order follows the original deck order.
 */
export function candidateRecipeIds(session: Session, turnIndex: number): string[] {
  if (turnIndex <= 0) {
    return [...session.recipeIds];
  }
  const ordered = orderedMembers(session);
  const previous = ordered[turnIndex - 1];
  if (!previous) return [];
  return likedRecipeIds(session, previous.id);
}

/** Has the given member swiped on every recipe in their candidate set? */
export function hasFinishedTurn(session: Session, member: Member): boolean {
  const candidates = candidateRecipeIds(session, member.order);
  const swiped = new Set(
    session.swipes.filter((s) => s.memberId === member.id).map((s) => s.recipeId),
  );
  return candidates.every((id) => swiped.has(id));
}

/** The member whose turn it currently is, or `undefined` once everyone is done. */
export function currentMember(session: Session): Member | undefined {
  return orderedMembers(session)[session.currentTurnIndex];
}

/** True once every member has taken their turn. */
export function isComplete(session: Session): boolean {
  return session.currentTurnIndex >= session.members.length;
}

/**
 * The final agreed-upon recipes: what the last member accepted.
 *
 * Returns an empty array if the funnel collapsed to nothing (someone rejected
 * everything) or the game isn't complete yet.
 */
export function finalResultIds(session: Session): string[] {
  if (!isComplete(session) || session.members.length === 0) {
    return [];
  }
  const ordered = orderedMembers(session);
  const last = ordered[ordered.length - 1];
  return likedRecipeIds(session, last.id);
}

/** A per-recipe summary of how it fared through the swipe funnel. */
export interface RecipeOutcome {
  recipeId: string;
  /** How many members (of those who got to see it) swiped right on it. */
  likes: number;
  /** How many members actually got to swipe on it before it dropped out. */
  seenBy: number;
  /** The member who first rejected it, ending its run; null if it survived. */
  eliminatedByMemberId: string | null;
  /** The turn order of the member who eliminated it; null if it survived. */
  eliminatedAtOrder: number | null;
  /** True if it was liked by everyone and made the final agreed set. */
  survived: boolean;
}

/**
 * Trace every deck recipe through the funnel: how many people liked it and,
 * if it didn't make it, which member's swipe knocked it out.
 *
 * A recipe is only ever shown to a member once everyone before them liked it,
 * so the first member (in turn order) to reject it is where it drops out.
 */
export function recipeOutcomes(session: Session): RecipeOutcome[] {
  const ordered = orderedMembers(session);

  // memberId -> (recipeId -> liked)
  const swipeMap = new Map<string, Map<string, boolean>>();
  for (const s of session.swipes) {
    let perMember = swipeMap.get(s.memberId);
    if (!perMember) {
      perMember = new Map();
      swipeMap.set(s.memberId, perMember);
    }
    perMember.set(s.recipeId, s.liked);
  }

  return session.recipeIds.map((recipeId) => {
    let likes = 0;
    let seenBy = 0;
    let eliminatedByMemberId: string | null = null;
    let eliminatedAtOrder: number | null = null;

    for (const member of ordered) {
      const liked = swipeMap.get(member.id)?.get(recipeId);
      // No swipe yet → this member never reached it (game still in progress,
      // or it was already eliminated upstream). Stop walking the chain.
      if (liked === undefined) break;
      seenBy += 1;
      if (liked) {
        likes += 1;
      } else {
        eliminatedByMemberId = member.id;
        eliminatedAtOrder = member.order;
        break;
      }
    }

    const survived =
      ordered.length > 0 &&
      eliminatedByMemberId === null &&
      seenBy === ordered.length;

    return { recipeId, likes, seenBy, eliminatedByMemberId, eliminatedAtOrder, survived };
  });
}
