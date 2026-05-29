import { useState } from "react";
import type { Recipe, Session } from "../api/types";
import { startSwiping, SessionError } from "../api/sessionApi";
import { orderedMembers } from "../lib/funnel";

interface Props {
  session: Session;
  meId: string;
  recipes: Recipe[];
  recipesLoading: boolean;
  onLeave: () => void;
}

export function Lobby({ session, meId, recipes, recipesLoading, onLeave }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isHost = session.hostId === meId;
  const members = orderedMembers(session);

  async function handleStart() {
    setError(null);
    setBusy(true);
    try {
      await startSwiping(
        session.code,
        recipes.map((r) => r.id),
      );
    } catch (err) {
      setError(err instanceof SessionError ? err.message : "Couldn't start.");
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="link" onClick={onLeave} type="button">
          ← Leave
        </button>
        <span className="topbar-title">Lobby</span>
        <span />
      </header>

      <div className="code-banner">
        <span className="code-banner-label">Party code</span>
        <span className="code-banner-value">{session.code}</span>
        <span className="code-banner-hint">Share this so others can join</span>
      </div>

      <section className="member-list">
        <h2>
          Who’s eating? <span className="muted">({members.length})</span>
        </h2>
        <ol>
          {members.map((m) => (
            <li key={m.id} className="member-row">
              <span className="avatar">{m.name.charAt(0).toUpperCase()}</span>
              <span className="member-name">
                {m.name}
                {m.id === meId && <span className="you-tag"> you</span>}
                {m.id === session.hostId && <span className="host-tag"> host</span>}
              </span>
              <span className="member-order">#{m.order + 1}</span>
            </li>
          ))}
        </ol>
        <p className="hint">
          You’ll swipe in join order. Each person narrows down the last person’s picks.
        </p>
      </section>

      {error && <p className="error">{error}</p>}

      <footer className="actions">
        {isHost ? (
          <button
            className="primary"
            onClick={handleStart}
            disabled={busy || recipesLoading || recipes.length === 0}
            type="button"
          >
            {recipesLoading
              ? "Loading recipes…"
              : busy
                ? "Starting…"
                : `Start swiping (${recipes.length} recipes)`}
          </button>
        ) : (
          <p className="waiting-note">
            Waiting for the host to start the party…
          </p>
        )}
      </footer>
    </div>
  );
}
