# DinnerMatch — Session Handoff / Context

> Paste this whole file into a fresh Claude Code session (or just leave it in the
> repo — Claude will read it) to bring it fully up to speed. It captures the
> original brief, every decision made, the architecture, current status, and the
> next steps.

## The product brief (verbatim intent)

A **Tinder-style app for choosing what to make for dinner** as a group:

- People **log in** and a party is formed from the selected members.
- A deck of **recipes is preloaded**.
- The **first person** to take their turn sees all available recipes and swipes
  **left to reject / right to accept**.
- The **next person** sees **only the recipes accepted so far** (i.e. what the
  previous person liked) and narrows them further.
- This continues down the line; at the end the **results are reported to all
  parties**.

## Decisions made (with the user)

| Question | Decision |
|---|---|
| Tech stack | React + TypeScript + Vite (user is building a recipe cookbook site) |
| Backend | **Mock it for now** — isolated behind `src/api/*` so a real backend swaps in cleanly |
| Multiplayer | **Separate devices, shared session** (joined via a party code) |
| Recipe source | **External recipe API**, mocked TheMealDB-shaped data for now |
| Repo | Standalone public repo `micheldumontier/dinner-tinder` (extracted from a subfolder of the bioportal repo where it was first built) |

## How the funnel works (the core rule)

- Turn 0 (first member) sees the **full deck**.
- Turn N sees **only the recipes the member at turn N-1 swiped right on**. The
  candidate set can only shrink.
- The **final result** = the recipes the **last** member accepted (i.e. those
  that survived every member's swipe in sequence). Ties produce a ranked
  shortlist; if the funnel collapses to nothing, the UI says "no match".

This logic is pure and unit-tested in `src/lib/funnel.ts` (see `funnel.test.ts`).

## Architecture (swap mock → real without touching the UI)

```
src/
  api/
    types.ts        # shared domain contract (Recipe, Member, Session, Swipe…)
    recipeApi.ts    # MOCK external recipe API (TheMealDB-shaped). Swap for real fetch().
    sessionApi.ts   # MOCK shared-session backend over localStorage + cross-tab
                    #   sync (storage event + poll). Swap for REST/WebSocket.
    identity.ts     # persists "who am I in which session" on this device
  lib/
    funnel.ts       # pure, tested swipe-funnel logic   ← keep as-is for real backend
  hooks/
    useSession.ts   # live-subscribes to a session, re-renders on change
  components/
    Login.tsx       # create or join a party (name + 4-letter code)
    Lobby.tsx       # party code + member list; host starts the game
    SwipeCard.tsx   # one draggable card (pointer drag + LIKE/NOPE stamps)
    SwipeDeck.tsx   # active swiper's deck + "waiting for X" screen for others
    Results.tsx     # winner + ranked shortlist; host can "play again"
  App.tsx           # orchestrator: routes Login → Lobby → SwipeDeck → Results
  styles/app.css    # the dark Tinder-style theme
```

Because "separate devices, shared session" is mocked with `localStorage`, the
shared state currently syncs across **tabs of the same browser** (via the
`storage` event), not across genuinely separate machines. Pointing
`sessionApi.ts` at a real server is what makes it cross-device for real — the
UI and `funnel.ts` need no changes.

## Current status — DONE ✅

- Full app implemented and working (`npm run dev`).
- 13 funnel unit tests passing (`npm test`).
- Clean type-check + production build (`npm run build`).
- GitHub Actions **CI** workflow (`.github/workflows/ci.yml`): type-check + test + build on push/PR.
- GitHub Actions **Pages deploy** workflow (`.github/workflows/deploy.yml`):
  builds with `GITHUB_PAGES=true` (sets Vite `base` to `/dinner-tinder/`) and
  publishes `dist/` to GitHub Pages.

### To enable the live demo
In the repo: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
The deploy workflow then publishes to `https://micheldumontier.github.io/dinner-tinder/`.

## Suggested next steps (not yet done)

1. **Real backend** — replace `sessionApi.ts` with a small server (e.g. a
   WebSocket or Supabase/Firebase) so separate devices truly share a session.
2. **Live recipe API** — replace `fetchRecipes()` in `recipeApi.ts` with a real
   TheMealDB call (`filter.php?c=` / `randomselection.php`).
3. **Lobby filters** — let the host pick cuisine / dietary constraints before
   loading the deck.
4. **Auth** — the current "login" is just a name; add real accounts if desired.
5. **Match feedback** — show, per recipe, how many people liked it.

## Run it

```bash
npm install
npm run dev        # open the printed URL; open a 2nd tab to play as a 2nd person
npm test           # funnel logic tests
npm run build      # type-check + production build
```
