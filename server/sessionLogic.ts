// Pure session state-machine for the real backend.
//
// These functions mirror sessionApi.local.ts but operate on plain Session
// objects (the HTTP server owns the in-memory store). The genuinely tricky
// rule — when a turn is finished and the funnel advances — is the *same*
// funnel logic the client uses, imported directly so the two can never drift.

import type { Member, Session } from "../src/api/types";
import { hasFinishedTurn, orderedMembers } from "../src/lib/funnel";

/** A user-facing failure (bad code, name clash, …) — maps to HTTP 400/404. */
export class SessionError extends Error {
  constructor(
    message: string,
    /** HTTP status the server should return. */
    public readonly status: number = 400,
  ) {
    super(message);
  }
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no easily-confused chars

export function randomCode(exists: (code: string) => boolean): string {
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
  } while (exists(code));
  return code;
}

export function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function createSession(
  hostName: string,
  exists: (code: string) => boolean,
): { session: Session; member: Member } {
  const name = hostName.trim();
  if (!name) throw new SessionError("Please enter your name.");

  const host: Member = { id: randomId(), name, order: 0, status: "waiting" };
  const session: Session = {
    code: randomCode(exists),
    hostId: host.id,
    phase: "lobby",
    members: [host],
    recipeIds: [],
    swipes: [],
    currentTurnIndex: 0,
    createdAt: Date.now(),
  };
  return { session, member: host };
}

export function joinSession(session: Session, memberName: string): Member {
  const name = memberName.trim();
  if (!name) throw new SessionError("Please enter your name.");
  if (session.phase !== "lobby") {
    throw new SessionError("That party has already started swiping.");
  }
  if (session.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
    throw new SessionError(`"${name}" is already in this party.`);
  }

  const member: Member = {
    id: randomId(),
    name,
    order: session.members.length,
    status: "waiting",
  };
  session.members.push(member);
  return member;
}

export function startSwiping(session: Session, recipeIds: string[]): void {
  if (session.phase !== "lobby") return;
  if (!Array.isArray(recipeIds) || recipeIds.length === 0) {
    throw new SessionError("No recipes loaded yet.");
  }
  session.recipeIds = recipeIds;
  session.phase = "swiping";
  session.currentTurnIndex = 0;
  orderedMembers(session).forEach((m, i) => (m.status = i === 0 ? "active" : "waiting"));
}

export function submitSwipe(
  session: Session,
  memberId: string,
  recipeId: string,
  liked: boolean,
): void {
  if (!session.members.some((m) => m.id === memberId)) {
    throw new SessionError("Unknown member for this session.");
  }
  const existing = session.swipes.find(
    (s) => s.memberId === memberId && s.recipeId === recipeId,
  );
  if (existing) {
    existing.liked = liked; // idempotent re-swipe
  } else {
    session.swipes.push({ memberId, recipeId, liked });
  }

  const active = orderedMembers(session)[session.currentTurnIndex];
  if (active && active.id === memberId && hasFinishedTurn(session, active)) {
    active.status = "done";
    session.currentTurnIndex += 1;
    const next = orderedMembers(session)[session.currentTurnIndex];
    if (next) {
      next.status = "active";
    } else {
      session.phase = "results";
    }
  }
}

export function playAgain(session: Session): void {
  session.phase = "lobby";
  session.swipes = [];
  session.recipeIds = [];
  session.currentTurnIndex = 0;
  session.members.forEach((m) => (m.status = "waiting"));
}
