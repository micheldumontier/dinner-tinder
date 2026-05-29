import { useState } from "react";
import type { Recipe, Session } from "../api/types";
import { finalResultIds } from "../lib/funnel";
import { playAgain } from "../api/sessionApi";

interface Props {
  session: Session;
  meId: string;
  recipeIndex: Map<string, Recipe>;
  onLeave: () => void;
}

export function Results({ session, meId, recipeIndex, onLeave }: Props) {
  const [busy, setBusy] = useState(false);
  const winnerIds = finalResultIds(session);
  const winners = winnerIds
    .map((id) => recipeIndex.get(id))
    .filter((r): r is Recipe => Boolean(r));
  const isHost = session.hostId === meId;

  const top = winners[0];

  async function handleAgain() {
    setBusy(true);
    await playAgain(session.code);
    setBusy(false);
  }

  return (
    <div className="screen results-screen">
      <header className="topbar">
        <button className="link" onClick={onLeave} type="button">
          ← Leave
        </button>
        <span className="topbar-title">Tonight’s dinner</span>
        <span />
      </header>

      {winners.length === 0 ? (
        <div className="empty-state">
          <span className="empty-emoji">😅</span>
          <h2>No match!</h2>
          <p className="muted">
            Nothing survived everyone’s swipes. Run it back with a fresh deck?
          </p>
        </div>
      ) : (
        <>
          <div className="winner-hero">
            <span className="confetti">🎉</span>
            <p className="winner-eyebrow">The party agreed on</p>
            <h1 className="winner-name">{top.name}</h1>
            <p className="winner-tags">
              {top.area} · {top.category}
            </p>
            <div
              className="winner-image"
              style={{ backgroundImage: `url(${top.thumbnail})` }}
            />
            {top.sourceUrl && (
              <a className="recipe-link" href={top.sourceUrl} target="_blank" rel="noreferrer">
                View full recipe ↗
              </a>
            )}
          </div>

          {winners.length > 1 && (
            <section className="runners-up">
              <h2>Everyone was also happy with</h2>
              <ul>
                {winners.slice(1).map((r) => (
                  <li key={r.id}>
                    <span
                      className="runner-thumb"
                      style={{ backgroundImage: `url(${r.thumbnail})` }}
                    />
                    <span>
                      {r.name}
                      <span className="muted"> · {r.area}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <footer className="actions">
        {isHost ? (
          <button className="primary" onClick={handleAgain} disabled={busy} type="button">
            {busy ? "Resetting…" : "Play again"}
          </button>
        ) : (
          <p className="waiting-note">Waiting for the host to start a new round…</p>
        )}
      </footer>
    </div>
  );
}
