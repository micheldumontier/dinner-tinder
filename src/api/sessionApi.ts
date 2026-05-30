// Session API facade.
//
// Picks the backend at build time, in order of precedence:
//   - VITE_BACKEND=webrtc   → peer-to-peer over the PeerJS public broker
//   - VITE_API_URL set      → real HTTP server (REST + Server-Sent Events)
//   - else                  → localStorage mock (cross-tab only)
//
// All three implement the same surface, so the UI never has to know which
// one is active.

import * as httpImpl from "./sessionApi.http";
import * as localImpl from "./sessionApi.local";
import * as webrtcImpl from "./sessionApi.webrtc";

function pickImpl() {
  if (import.meta.env.VITE_BACKEND === "webrtc") return webrtcImpl;
  if (import.meta.env.VITE_API_URL) return httpImpl;
  return localImpl;
}

const impl = pickImpl();

export const createSession = impl.createSession;
export const joinSession = impl.joinSession;
export const getSession = impl.getSession;
export const startSwiping = impl.startSwiping;
export const submitSwipe = impl.submitSwipe;
export const endSession = impl.endSession;
export const playAgain = impl.playAgain;
export const subscribe = impl.subscribe;

export { SessionError } from "./sessionApi.shared";
