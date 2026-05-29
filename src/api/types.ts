// Shared domain types for DinnerMatch.
//
// These describe the data contract between the UI and the (currently mocked)
// backend + recipe service. Keeping them here means swapping the mock for a
// real API later only requires re-implementing the api/* modules, not the UI.

export interface Recipe {
  id: string;
  name: string;
  category: string;
  area: string;
  /** Image URL (TheMealDB-shaped). UI falls back to a gradient if it fails. */
  thumbnail: string;
  instructions: string;
  ingredients: string[];
  sourceUrl?: string;
}

export type MemberStatus = "waiting" | "active" | "done";

export interface Member {
  id: string;
  name: string;
  /** Turn order, assigned in the order members joined the session. */
  order: number;
  status: MemberStatus;
}

export interface Swipe {
  memberId: string;
  recipeId: string;
  liked: boolean;
}

export type SessionPhase = "lobby" | "swiping" | "results";

export interface Session {
  code: string;
  hostId: string;
  phase: SessionPhase;
  members: Member[];
  /** The full preloaded deck of recipe ids, in display order. */
  recipeIds: string[];
  swipes: Swipe[];
  /** Index into the turn-ordered member list whose turn it currently is. */
  currentTurnIndex: number;
  createdAt: number;
}

/** Identity of the current user on this device. */
export interface Identity {
  sessionCode: string;
  memberId: string;
}
