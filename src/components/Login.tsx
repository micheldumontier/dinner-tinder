import { useState } from "react";
import { createSession, joinSession, SessionError } from "../api/sessionApi";
import type { Identity } from "../api/types";

interface Props {
  onJoined: (identity: Identity) => void;
}

type Mode = "create" | "join";

export function Login({ onJoined }: Props) {
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
          {busy ? "…" : mode === "create" ? "Create party" : "Join party"}
        </button>
      </form>

      <p className="hint">
        Tip: open this app in two tabs to play as two people on “separate devices”.
      </p>
    </div>
  );
}
