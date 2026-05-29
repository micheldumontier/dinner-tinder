// Mock backend for shared dinner sessions.
//
// "Separate devices, shared session" is simulated here with localStorage as the
// shared store plus the `storage` event (which fires in *other* tabs of the
// same origin) for live sync — so two browser tabs behave like two phones in
// the same party. A short polling interval covers the same-tab case.
//
// Every method is async and returns Promises, mirroring a real network API.
// To go live, re-implement these methods against your cookbook backend (REST
// or WebSocket); the UI and the funnel logic stay exactly the same.

import type { Member, Session } from "./types";
import { hasFinishedTurn, orderedMembers } from "../lib/funnel";

const STORE_PREFIX = "dinnermatch:session:";
const LATENCY_MS = 120;

type Listener = (session: Session) => void;

function storeKey(code: string): string {
  return `${STORE_PREFIX}${code}`;
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function readSession(code: string): Session | null {
  const raw = localStorage.getItem(storeKey(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function writeSession(session: Session): Session {
  localStorage.setItem(storeKey(session.code), JSON.stringify(session));
  // Notify same-tab subscribers immediately (storage events don't fire in the
  // tab that performed the write).
  notifyLocal(session);
  return session;
}

// --- same-tab pub/sub ------------------------------------------------------

const localListeners = new Map<string, Set<Listener>>();

function notifyLocal(session: Session) {
  localListeners.get(session.code)?.forEach((cb) => cb(session));
}

// --- id helpers ------------------------------------------------------------

function randomCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no easily-confused chars
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// --- public API ------------------------------------------------------------

export class SessionError extends Error {}

/** Create a brand-new session and return it along with the host's identity. */
export async function createSession(
  hostName: string,
): Promise<{ session: Session; member: Member }> {
  const name = hostName.trim();
  if (!name) throw new SessionError("Please enter your name.");

  let code = randomCode();
  while (readSession(code)) code = randomCode(); // avoid collisions

  const host: Member = { id: randomId(), name, order: 0, status: "waiting" };
  const session: Session = {
    code,
    hostId: host.id,
    phase: "lobby",
    members: [host],
    recipeIds: [],
    swipes: [],
    currentTurnIndex: 0,
    createdAt: Date.now(),
  };
  writeSession(session);
  return delay({ session, member: host });
}

/** Join an existing session that is still in the lobby. */
export async function joinSession(
  code: string,
  memberName: string,
): Promise<{ session: Session; member: Member }> {
  const upper = code.trim().toUpperCase();
  const name = memberName.trim();
  if (!name) throw new SessionError("Please enter your name.");

  const session = readSession(upper);
  if (!session) throw new SessionError(`No session found with code "${upper}".`);
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
  writeSession(session);
  return delay({ session, member });
}

/** Fetch the current state of a session. */
export async function getSession(code: string): Promise<Session> {
  const session = readSession(code);
  if (!session) throw new SessionError(`No session found with code "${code}".`);
  return delay(session);
}

/**
 * Host kicks off the game: lock in the preloaded deck, move to the swiping
 * phase, and make the first member active.
 */
export async function startSwiping(code: string, recipeIds: string[]): Promise<Session> {
  const session = readSession(code);
  if (!session) throw new SessionError(`No session found with code "${code}".`);
  if (session.phase !== "lobby") return delay(session);
  if (recipeIds.length === 0) throw new SessionError("No recipes loaded yet.");

  session.recipeIds = recipeIds;
  session.phase = "swiping";
  session.currentTurnIndex = 0;
  const ordered = orderedMembers(session);
  ordered.forEach((m, i) => (m.status = i === 0 ? "active" : "waiting"));
  writeSession(session);
  return delay(session);
}

/**
 * Record one swipe. After writing, if the active member has now swiped on
 * every recipe in their candidate set, advance the turn (and finish the game
 * once the last member is done).
 */
export async function submitSwipe(
  code: string,
  memberId: string,
  recipeId: string,
  liked: boolean,
): Promise<Session> {
  const session = readSession(code);
  if (!session) throw new SessionError(`No session found with code "${code}".`);

  const existing = session.swipes.find(
    (s) => s.memberId === memberId && s.recipeId === recipeId,
  );
  if (existing) {
    existing.liked = liked; // allow re-swipe / idempotent retries
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

  writeSession(session);
  return delay(session);
}

/** Reset a finished session back to the lobby for another round. */
export async function playAgain(code: string): Promise<Session> {
  const session = readSession(code);
  if (!session) throw new SessionError(`No session found with code "${code}".`);
  session.phase = "lobby";
  session.swipes = [];
  session.recipeIds = [];
  session.currentTurnIndex = 0;
  session.members.forEach((m) => (m.status = "waiting"));
  writeSession(session);
  return delay(session);
}

/**
 * Subscribe to live updates for a session. Fires on cross-tab `storage` events
 * and a low-frequency poll (for the same-tab case). Returns an unsubscribe fn.
 */
export function subscribe(code: string, onChange: Listener): () => void {
  // same-tab listeners
  const set = localListeners.get(code) ?? new Set<Listener>();
  set.add(onChange);
  localListeners.set(code, set);

  // cross-tab updates
  const onStorage = (e: StorageEvent) => {
    if (e.key === storeKey(code) && e.newValue) {
      try {
        onChange(JSON.parse(e.newValue) as Session);
      } catch {
        /* ignore malformed payloads */
      }
    }
  };
  window.addEventListener("storage", onStorage);

  // polling fallback to catch anything the events miss
  let last = localStorage.getItem(storeKey(code));
  const poll = window.setInterval(() => {
    const current = localStorage.getItem(storeKey(code));
    if (current && current !== last) {
      last = current;
      try {
        onChange(JSON.parse(current) as Session);
      } catch {
        /* ignore */
      }
    }
  }, 1000);

  return () => {
    set.delete(onChange);
    window.removeEventListener("storage", onStorage);
    window.clearInterval(poll);
  };
}
