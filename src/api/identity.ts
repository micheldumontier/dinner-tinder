// Persists "who am I, in which session" on this device, so a refresh doesn't
// kick you out of the party.

import type { Identity } from "./types";

const KEY = "dinnermatch:identity";

export function saveIdentity(identity: Identity): void {
  localStorage.setItem(KEY, JSON.stringify(identity));
}

export function loadIdentity(): Identity | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Identity;
  } catch {
    return null;
  }
}

export function clearIdentity(): void {
  localStorage.removeItem(KEY);
}
