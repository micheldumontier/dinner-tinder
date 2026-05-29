// Session API facade.
//
// Picks the backend at build time: if VITE_API_URL is set, the app talks to a
// real server (REST + SSE, see sessionApi.http.ts and server/); otherwise it
// uses the localStorage mock (sessionApi.local.ts), which syncs across tabs of
// the same browser only. The UI imports only from here and never needs to know
// which one is active.

import * as httpImpl from "./sessionApi.http";
import * as localImpl from "./sessionApi.local";

const impl = import.meta.env.VITE_API_URL ? httpImpl : localImpl;

export const createSession = impl.createSession;
export const joinSession = impl.joinSession;
export const getSession = impl.getSession;
export const startSwiping = impl.startSwiping;
export const submitSwipe = impl.submitSwipe;
export const playAgain = impl.playAgain;
export const subscribe = impl.subscribe;

export { SessionError } from "./sessionApi.shared";
