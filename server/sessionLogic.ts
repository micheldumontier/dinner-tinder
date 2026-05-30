// Pure session state-machine for the real backend.
//
// These functions mirror sessionApi.local.ts but operate on plain Session
// objects (the HTTP server owns the in-memory store). The funnel-related rules
// live in src/lib/funnel.ts so the client and server can't drift.

import type { Member, Session } from "../src/api/types";
import { hasFinishedSwiping } from "../src/lib/funnel";

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
    createdAt: Date.now(),
  };
  return { session, member: host };
}

export function joinSession(session: Session, memberName: string): Member {
  const name = memberName.trim();
  if (!name) throw new SessionError("Please enter your name.");
  if (session.phase === "results") {
    throw new SessionError("That party has already finished.");
  }
  if (session.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
    throw new SessionError(`"${name}" is already in this party.`);
  }

  // Lobby members are "waiting" until the host starts; mid-swipe joiners are
  // immediately active because the round is already underway.
  const member: Member = {
    id: randomId(),
    name,
    order: session.members.length,
    status: session.phase === "swiping" ? "active" : "waiting",
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
  session.members.forEach((m) => (m.status = "active"));
}

export function submitSwipe(
  session: Session,
  memberId: string,
  recipeId: string,
  liked: boolean,
): void {
  const member = session.members.find((m) => m.id === memberId);
  if (!member) {
    throw new SessionError("Unknown member for this session.");
  }
  if (session.phase !== "swiping") {
    throw new SessionError("This party isn't accepting swipes right now.");
  }

  const existing = session.swipes.find(
    (s) => s.memberId === memberId && s.recipeId === recipeId,
  );
  if (existing) {
    existing.liked = liked; // idempotent re-swipe
  } else {
    session.swipes.push({ memberId, recipeId, liked });
  }

  if (hasFinishedSwiping(session, member)) {
    member.status = "done";
  }
  // No auto-end: even when everyone (including the host) has finished
  // swiping, the round stays open until the host explicitly hits "End
  // selection". Otherwise the host's final swipe would silently close
  // the door on late joiners.
}

export function endSession(session: Session): void {
  if (session.phase !== "swiping") return;
  session.phase = "results";
  session.members.forEach((m) => (m.status = "done"));
}

export function playAgain(session: Session): void {
  session.phase = "lobby";
  session.swipes = [];
  session.recipeIds = [];
  session.members.forEach((m) => (m.status = "waiting"));
}
