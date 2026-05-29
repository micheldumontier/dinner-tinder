import { useEffect, useMemo, useState } from "react";
import type { Identity, Recipe } from "./api/types";
import { fetchRecipes, indexRecipes } from "./api/recipeApi";
import { clearIdentity, loadIdentity, saveIdentity } from "./api/identity";
import { useSession } from "./hooks/useSession";
import { Login } from "./components/Login";
import { Lobby } from "./components/Lobby";
import { SwipeDeck } from "./components/SwipeDeck";
import { Results } from "./components/Results";

export default function App() {
  const [identity, setIdentity] = useState<Identity | null>(() => loadIdentity());
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);

  const session = useSession(identity?.sessionCode ?? null);

  // Preload the recipe deck once, up front.
  useEffect(() => {
    let active = true;
    fetchRecipes()
      .then((r) => active && setRecipes(r))
      .finally(() => active && setRecipesLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const recipeIndex = useMemo(() => indexRecipes(recipes), [recipes]);

  function handleJoined(next: Identity) {
    saveIdentity(next);
    setIdentity(next);
  }

  function handleLeave() {
    clearIdentity();
    setIdentity(null);
  }

  if (!identity) {
    return <Login onJoined={handleJoined} />;
  }

  if (!session) {
    return (
      <div className="screen center">
        <p className="muted">Loading party {identity.sessionCode}…</p>
        <button className="link" onClick={handleLeave} type="button">
          Start over
        </button>
      </div>
    );
  }

  const meId = identity.memberId;

  switch (session.phase) {
    case "lobby":
      return (
        <Lobby
          session={session}
          meId={meId}
          recipes={recipes}
          recipesLoading={recipesLoading}
          onLeave={handleLeave}
        />
      );
    case "swiping":
      return <SwipeDeck session={session} meId={meId} recipeIndex={recipeIndex} />;
    case "results":
      return (
        <Results
          session={session}
          meId={meId}
          recipeIndex={recipeIndex}
          onLeave={handleLeave}
        />
      );
  }
}
