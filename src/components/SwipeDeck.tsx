import { useMemo, useState } from "react";
import type { Recipe, Session } from "../api/types";
import { submitSwipe } from "../api/sessionApi";
import {
  candidateRecipeIds,
  currentMember,
  orderedMembers,
} from "../lib/funnel";
import { SwipeCard } from "./SwipeCard";

interface Props {
  session: Session;
  meId: string;
  recipeIndex: Map<string, Recipe>;
}

export function SwipeDeck({ session, meId, recipeIndex }: Props) {
  const active = currentMember(session);
  const me = session.members.find((m) => m.id === meId);
  const isMyTurn = active?.id === meId;

  if (!active || !me) {
    return null;
  }

  if (!isMyTurn) {
    return <WaitingTurn session={session} activeName={active.name} />;
  }

  return <ActiveDeck session={session} me={me} recipeIndex={recipeIndex} />;
}

// --- The deck the active swiper sees ---------------------------------------

function ActiveDeck({
  session,
  me,
  recipeIndex,
}: {
  session: Session;
  me: { id: string; order: number };
  recipeIndex: Map<string, Recipe>;
}) {
  // The full candidate set for this turn, fixed for the duration of the turn.
  const candidates = useMemo(
    () => candidateRecipeIds(session, me.order),
    // Only recompute when the turn's input set actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.code, me.order, session.currentTurnIndex],
  );

  // Track how many of *my* candidates I've already swiped (survives reloads).
  const alreadySwiped = new Set(
    session.swipes.filter((s) => s.memberId === me.id).map((s) => s.recipeId),
  );
  const remaining = candidates.filter((id) => !alreadySwiped.has(id));
  const [index, setIndex] = useState(0);

  const isFirstTurn = me.order === 0;
  const liveRemaining = remaining.slice(index);

  async function handleSwipe(recipeId: string, liked: boolean) {
    setIndex((i) => i + 1);
    await submitSwipe(session.code, me.id, recipeId, liked);
  }

  if (candidates.length === 0) {
    // The previous person rejected everything — nothing to swipe on.
    return (
      <div className="screen center">
        <div className="empty-state">
          <span className="empty-emoji">🤷</span>
          <h2>Nothing made it this far</h2>
          <p className="muted">
            Everything got swiped away before your turn. Time to negotiate the
            old-fashioned way!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen swipe-screen">
      <header className="topbar">
        <span className="topbar-title">Your turn{isFirstTurn ? "" : " — narrow it down"}</span>
        <span className="counter">
          {Math.min(index, remaining.length)}/{remaining.length} swiped
        </span>
      </header>

      <div className="deck">
        {liveRemaining.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">✅</span>
            <h2>All done!</h2>
            <p className="muted">Saving your picks…</p>
          </div>
        ) : (
          liveRemaining
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

      {liveRemaining.length > 0 && (
        <div className="swipe-buttons">
          <button
            className="circle nope"
            aria-label="Pass"
            onClick={() => handleSwipe(liveRemaining[0], false)}
            type="button"
          >
            ✕
          </button>
          <button
            className="circle like"
            aria-label="Like"
            onClick={() => handleSwipe(liveRemaining[0], true)}
            type="button"
          >
            ♥
          </button>
        </div>
      )}
    </div>
  );
}

// --- What everyone else sees while it isn't their turn ---------------------

function WaitingTurn({ session, activeName }: { session: Session; activeName: string }) {
  const ordered = orderedMembers(session);
  return (
    <div className="screen center">
      <div className="empty-state">
        <span className="empty-emoji pulse">⏳</span>
        <h2>{activeName} is swiping…</h2>
        <p className="muted">You’ll get the recipes they like next.</p>
      </div>
      <ol className="turn-track">
        {ordered.map((m) => (
          <li key={m.id} className={`turn-pip ${m.status}`}>
            <span className="avatar small">{m.name.charAt(0).toUpperCase()}</span>
            <span>{m.name}</span>
            <span className="turn-status">
              {m.status === "done" ? "✓" : m.status === "active" ? "swiping" : "waiting"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
