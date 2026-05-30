import { useEffect, useMemo, useState } from "react";
import type { Recipe, Session } from "../api/types";
import { startSwiping, SessionError } from "../api/sessionApi";
import { orderedMembers } from "../lib/funnel";

interface ShareLinkProps {
  code: string;
}

function ShareLink({ code }: ShareLinkProps) {
  const url = useMemo(() => {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base.replace(/\/+$/, "")}/?join=${encodeURIComponent(code)}`;
  }, [code]);
  const [copied, setCopied] = useState(false);
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Older browsers / insecure contexts: fall back to selecting the input.
      const input = document.getElementById("share-link-input") as HTMLInputElement | null;
      input?.select();
      input?.setSelectionRange(0, url.length);
    }
  }

  async function handleShare() {
    try {
      await navigator.share({
        title: "DinnerMatch",
        text: `Join my DinnerMatch party (code ${code})`,
        url,
      });
    } catch {
      // user cancelled or share unavailable — silently no-op
    }
  }

  return (
    <div className="share-link">
      <input
        id="share-link-input"
        className="share-link-input"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Shareable join link"
      />
      <div className="share-link-actions">
        <button type="button" className="share-btn" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy link"}
        </button>
        {canNativeShare && (
          <button type="button" className="share-btn share-btn-secondary" onClick={handleShare}>
            Share…
          </button>
        )}
      </div>
    </div>
  );
}
import {
  EMPTY_FILTERS,
  availableFilterOptions,
  filterRecipes,
  hasActiveFilters,
  type RecipeFilters,
} from "../lib/filters";

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
  const [filters, setFilters] = useState<RecipeFilters>(EMPTY_FILTERS);
  const isHost = session.hostId === meId;
  const members = orderedMembers(session);

  const options = useMemo(() => availableFilterOptions(recipes), [recipes]);
  const filtered = useMemo(() => filterRecipes(recipes, filters), [recipes, filters]);
  const filtersActive = hasActiveFilters(filters);

  function toggle(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  async function handleStart() {
    setError(null);
    setBusy(true);
    try {
      await startSwiping(
        session.code,
        filtered.map((r) => r.id),
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
        <ShareLink code={session.code} />
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
          Everyone swipes at the same time once the host starts. Others can still
          join after — they'll see the same deck.
        </p>
      </section>

      {isHost && !recipesLoading && (
        <section className="filters">
          <h2>
            Narrow the menu{" "}
            <span className="muted">
              ({filtered.length} of {recipes.length} recipes)
            </span>
          </h2>

          <div className="filter-group">
            <span className="filter-label">Cuisine</span>
            <div className="chips">
              {options.areas.map((area) => {
                const on = filters.areas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    className={on ? "chip on" : "chip"}
                    aria-pressed={on}
                    onClick={() =>
                      setFilters((f) => ({ ...f, areas: toggle(f.areas, area) }))
                    }
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Category</span>
            <div className="chips">
              {options.categories.map((category) => {
                const on = filters.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    className={on ? "chip on" : "chip"}
                    aria-pressed={on}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        categories: toggle(f.categories, category),
                      }))
                    }
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="filter-group">
            <label className="veg-toggle">
              <input
                type="checkbox"
                checked={filters.vegetarianOnly}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, vegetarianOnly: e.target.checked }))
                }
              />
              <span>🌱 Vegetarian only</span>
            </label>
            {filtersActive && (
              <button
                type="button"
                className="link clear-filters"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                Clear filters
              </button>
            )}
          </div>

          {filtered.length === 0 && (
            <p className="hint warn">
              No recipes match those filters — loosen them to start.
            </p>
          )}
        </section>
      )}

      {error && <p className="error">{error}</p>}

      <footer className="actions">
        {isHost ? (
          <button
            className="primary"
            onClick={handleStart}
            disabled={busy || recipesLoading || filtered.length === 0}
            type="button"
          >
            {recipesLoading
              ? "Loading recipes…"
              : busy
                ? "Starting…"
                : `Start swiping (${filtered.length} recipes)`}
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
