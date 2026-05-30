import { useRef, useState } from "react";
import type { Recipe, Session } from "../api/types";
import { endSession, submitSwipe } from "../api/sessionApi";
import { candidateRecipeIds, orderedMembers } from "../lib/funnel";
import { SwipeCard } from "./SwipeCard";

interface Props {
  session: Session;
  meId: string;
  recipeIndex: Map<string, Recipe>;
}

export function SwipeDeck({ session, meId, recipeIndex }: Props) {
  const me = session.members.find((m) => m.id === meId);
  if (!me) return null;
  return <ActiveDeck session={session} me={me} recipeIndex={recipeIndex} />;
}

// --- The deck the active swiper sees ---------------------------------------

function ActiveDeck({
  session,
  me,
  recipeIndex,
}: {
  session: Session;
  me: { id: string; name: string };
  recipeIndex: Map<string, Recipe>;
}) {
  // Optimistically remove a card the moment the user swipes, before the server
  // round-trip lands. A ref (not state) keeps successive swipes from racing
  // each other on the same render.
  const pendingRef = useRef<Set<string>>(new Set());
  const [, forcePendingTick] = useState(0);
  const [endBusy, setEndBusy] = useState(false);

  const candidates = candidateRecipeIds(session, me.id).filter(
    (id) => !pendingRef.current.has(id),
  );
  const totalDeck = session.recipeIds.length;
  const swipedCount = totalDeck - candidates.length;
  const isHost = session.hostId === me.id;

  async function handleSwipe(recipeId: string, liked: boolean) {
    pendingRef.current.add(recipeId);
    forcePendingTick((n) => n + 1);
    try {
      await submitSwipe(session.code, me.id, recipeId, liked);
    } catch (err) {
      pendingRef.current.delete(recipeId);
      forcePendingTick((n) => n + 1);
      throw err;
    }
  }

  async function handleEnd() {
    setEndBusy(true);
    try {
      await endSession(session.code);
    } finally {
      setEndBusy(false);
    }
  }

  return (
    <div className="screen swipe-screen">
      <header className="topbar">
        <span className="topbar-title">Pick tonight's dinner</span>
        <span className="counter">
          {swipedCount}/{totalDeck} swiped
        </span>
      </header>

      <div className="deck">
        {candidates.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">✅</span>
            <h2>You're all done!</h2>
            <p className="muted">Waiting for the others to wrap up…</p>
          </div>
        ) : (
          candidates
            .slice(0, 3)
            .map((id, depth) => {
              const recipe = recipeIndex.get(id);
              if (!recipe) return null;
              return (
                <SwipeCard
                  key={id}
                  recipe={recipe}
                  depth={depth}
                  onSwipe={(liked) => handleSwipe(id, liked)}
                />
              );
            })
            .reverse() /* render deepest first so the top card paints last */
        )}
      </div>

      {candidates.length > 0 && (
        <div className="swipe-buttons">
          <button
            className="circle nope"
            aria-label="Pass"
            onClick={() => handleSwipe(candidates[0], false)}
            type="button"
          >
            ✕
          </button>
          <button
            className="circle like"
            aria-label="Like"
            onClick={() => handleSwipe(candidates[0], true)}
            type="button"
          >
            ♥
          </button>
        </div>
      )}

      <PartyStrip session={session} meId={me.id} />

      {isHost && (
        <footer className="actions">
          <button
            className="secondary"
            onClick={handleEnd}
            disabled={endBusy}
            type="button"
          >
            {endBusy ? "Ending…" : "End selection & see results"}
          </button>
        </footer>
      )}
    </div>
  );
}

// --- Live status of the whole party ----------------------------------------

function PartyStrip({ session, meId }: { session: Session; meId: string }) {
  const members = orderedMembers(session);
  return (
    <ol className="turn-track">
      {members.map((m) => {
        const personal = candidateRecipeIds(session, m.id).length;
        const total = session.recipeIds.length;
        const done = personal === 0;
        return (
          <li key={m.id} className={`turn-pip ${done ? "done" : "active"}`}>
            <span className="avatar small">{m.name.charAt(0).toUpperCase()}</span>
            <span>
              {m.name}
              {m.id === meId && <span className="you-tag"> you</span>}
            </span>
            <span className="turn-status">
              {done ? "✓ done" : `${total - personal}/${total}`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
