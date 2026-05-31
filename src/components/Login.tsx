import { useEffect, useState } from "react";
import { createSession, joinSession, SessionError } from "../api/sessionApi";
import type { Identity } from "../api/types";

interface Props {
  onJoined: (identity: Identity) => void;
}

type Mode = "create" | "join";

/** If the URL has `?join=CODE`, pre-fill the join form with that code. */
function readJoinCode(): string | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("join");
  if (!param) return null;
  return param.trim().toUpperCase().slice(0, 4);
}

export function Login({ onJoined }: Props) {
  const initialJoinCode = readJoinCode();
  const [mode, setMode] = useState<Mode>(initialJoinCode ? "join" : "create");
  const [name, setName] = useState("");
  const [code, setCode] = useState(initialJoinCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Strip the ?join= param from the address bar once we've consumed it, so a
  // later reload doesn't keep forcing the join flow.
  useEffect(() => {
    if (!initialJoinCode || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("join");
    window.history.replaceState({}, "", url.toString());
  }, [initialJoinCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === "create"
          ? await createSession(name)
          : await joinSession(code, name);
      onJoined({ sessionCode: result.session.code, memberId: result.member.id });
    } catch (err) {
      setError(err instanceof SessionError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen center">
      <div className="brand">
        <span className="brand-logo">🍽️</span>
        <h1>DinnerMatch</h1>
        <p className="tagline">Swipe right on tonight's dinner.</p>
      </div>

      <div className="tabs">
        <button
          className={mode === "create" ? "tab active" : "tab"}
          onClick={() => setMode("create")}
          type="button"
        >
          Start a party
        </button>
        <button
          className={mode === "join" ? "tab active" : "tab"}
          onClick={() => setMode("join")}
          type="button"
        >
          Join a party
        </button>
      </div>

      <form className="card-form" onSubmit={handleSubmit}>
        <label>
          Your name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Michel"
            autoFocus
            maxLength={24}
          />
        </label>

        {mode === "join" && (
          <label>
            Party code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              maxLength={4}
              className="code-input"
            />
          </label>
        )}

        {error && <p className="error">{error}</p>}

        <button className="primary" type="submit" disabled={busy}>
          {busy
            ? mode === "create"
              ? "Creating…"
              : "Looking for the host…"
            : mode === "create"
              ? "Create party"
              : "Join party"}
        </button>

        {busy && mode === "join" && (
          <p className="hint">
            Keep this open — make sure the host has DinnerMatch on screen too.
          </p>
        )}
      </form>

      <p className="hint">
        Tip: open this app in two tabs to play as two people on “separate devices”.
      </p>
    </div>
  );
}
