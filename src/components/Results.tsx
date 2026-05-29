import { useState } from "react";
import type { Member, Recipe, Session } from "../api/types";
import { finalResultIds, orderedMembers, recipeOutcomes } from "../lib/funnel";
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
  const memberCount = orderedMembers(session).length;

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

      <FunnelBreakdown session={session} recipeIndex={recipeIndex} memberCount={memberCount} />

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

// --- Per-recipe "how it went" breakdown ------------------------------------

function FunnelBreakdown({
  session,
  recipeIndex,
  memberCount,
}: {
  session: Session;
  recipeIndex: Map<string, Recipe>;
  memberCount: number;
}) {
  const memberById = new Map<string, Member>(session.members.map((m) => [m.id, m]));
  const outcomes = recipeOutcomes(session);
  if (outcomes.length === 0) return null;

  // Survivors first, then most-liked, preserving deck order within ties.
  const sorted = [...outcomes].sort((a, b) => {
    if (a.survived !== b.survived) return a.survived ? -1 : 1;
    return b.likes - a.likes;
  });

  return (
    <details className="breakdown">
      <summary>See how each dish did</summary>
      <ul className="breakdown-list">
        {sorted.map((o) => {
          const recipe = recipeIndex.get(o.recipeId);
          if (!recipe) return null;
          const eliminatedBy = o.eliminatedByMemberId
            ? memberById.get(o.eliminatedByMemberId)?.name
            : null;
          return (
            <li key={o.recipeId} className={o.survived ? "breakdown-row survived" : "breakdown-row"}>
              <span
                className="runner-thumb"
                style={{ backgroundImage: `url(${recipe.thumbnail})` }}
              />
              <span className="breakdown-main">
                <span className="breakdown-name">{recipe.name}</span>
                <span className="breakdown-meta">
                  ♥ {o.likes}/{memberCount} liked
                </span>
              </span>
              <span className="breakdown-status">
                {o.survived ? (
                  <span className="tag-survived">✓ winner</span>
                ) : eliminatedBy ? (
                  <span className="tag-out">out at {eliminatedBy}’s turn</span>
                ) : (
                  <span className="tag-out">not reached</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
