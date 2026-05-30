// Live-subscribes to a session and re-renders whenever its shared state changes
// (in this tab or another). Returns the latest session snapshot.

import { useEffect, useState } from "react";
import type { Session } from "../api/types";
import { getSession, subscribe } from "../api/sessionApi";

export function useSession(code: string | null): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!code) {
      setSession(null);
      return;
    }
    let active = true;
    // If getSession fails transiently (e.g. the WebRTC adapter briefly can't
    // find an instance during a remount), preserve whatever state we already
    // have rather than flashing the UI to "Loading party… / Start over".
    // Future state arrives via the subscribe callback either way.
    getSession(code)
      .then((s) => {
        if (active) setSession(s);
      })
      .catch(() => {
        /* keep existing state; subscribe will fill in if/when it lands */
      });

    const unsubscribe = subscribe(code, (s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [code]);

  return session;
}
