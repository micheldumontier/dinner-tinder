// Shared bits used by every session-API implementation (mock + real).

import type { Session } from "./types";

/** Thrown for any expected, user-facing session failure (bad code, etc.). */
export class SessionError extends Error {}

/** A subscriber notified whenever a session's shared state changes. */
export type SessionListener = (session: Session) => void;
