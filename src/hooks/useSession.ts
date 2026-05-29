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
    getSession(code)
      .then((s) => active && setSession(s))
      .catch(() => active && setSession(null));

    const unsubscribe = subscribe(code, (s) => active && setSession(s));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [code]);

  return session;
}
