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
    types.ts             # shared domain contract (Recipe, Member, Session, Swipe…)
    recipeApi.ts         # MOCK external recipe API (TheMealDB-shaped). Swap for real fetch().
    sessionApi.ts        # FACADE: picks the backend from VITE_API_URL
    sessionApi.shared.ts # SessionError + listener type shared by both backends
    sessionApi.local.ts  # MOCK backend over localStorage + cross-tab sync (default)
    sessionApi.http.ts   # REAL backend client: REST + Server-Sent Events
    identity.ts          # persists "who am I in which session" on this device
  lib/
    funnel.ts            # pure, tested swipe-funnel logic + recipeOutcomes()
    filters.ts           # pure, tested lobby filtering (cuisine/category/veg)
  hooks/
    useSession.ts        # live-subscribes to a session, re-renders on change
  components/
    Login.tsx            # create or join a party (name + 4-letter code)
    Lobby.tsx            # code + member list + host filter chips; host starts
    SwipeCard.tsx        # one draggable card (pointer drag + LIKE/NOPE stamps)
    SwipeDeck.tsx        # active swiper's deck + "waiting for X" screen for others
    Results.tsx          # winner + shortlist + per-dish funnel breakdown
  App.tsx                # orchestrator: routes Login → Lobby → SwipeDeck → Results
  styles/app.css         # the dark Tinder-style theme
server/                  # REAL backend (Express, in-memory, REST + SSE)
  index.ts               # routes + SSE stream + in-memory store
  sessionLogic.ts        # pure transitions, reusing src/lib/funnel.ts
  *.test.ts              # pure-logic + HTTP integration (incl. SSE) tests
```

### Backend: mock vs real
- **Default (no env):** `sessionApi.local.ts` keeps shared state in
  `localStorage`, syncing across **tabs of the same browser** via the `storage`
  event. Great for a single-machine demo.
- **Real (`VITE_API_URL` set):** `sessionApi.http.ts` talks to the `server/`
  Express app over REST, and receives live updates over **Server-Sent Events** —
  genuinely cross-device. Two values are supported:
  - a full URL (`http://host:port`) — the client always calls that origin
  - `auto` — derive the API origin from `window.location.hostname` at runtime,
    swapping the port to `VITE_API_PORT` (default `8787`). Lets one dev server
    serve both `localhost` and LAN-IP clients without rebuilding.

Both implement the **same function surface** and the server reuses the **same
`funnel.ts`** for turn advancement, so the two can't drift. The UI and
`funnel.ts` never change between them.

## Current status — DONE ✅

- Full app implemented and working (`npm run dev`).
- **45 tests passing** (`npm test`): funnel + filters (pure), backend session
  logic (pure), and an HTTP integration test that boots the server and verifies
  the REST flow **and** the live SSE stream.
- Clean client + server type-checks (`npm run lint`, `npm run lint:server`) and
  production build (`npm run build`).
- **Lobby filters** — host narrows the deck by cuisine, category, and a
  vegetarian-only toggle before starting (`src/lib/filters.ts`).
- **Match feedback** — Results shows a per-dish breakdown: like counts and where
  each recipe dropped out of the funnel (`recipeOutcomes()` in `funnel.ts`).
- **Real backend** — `server/` (Express + SSE) + the `sessionApi` facade; the
  app goes cross-device by setting `VITE_API_URL`.
- GitHub Actions **CI** (`.github/workflows/ci.yml`): client + server type-check,
  test, build. **Pages deploy** (`.github/workflows/deploy.yml`) publishes the
  client (mock backend) to GitHub Pages with `GITHUB_PAGES=true`.

### To enable the live demo
In the repo: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
The deploy workflow then publishes to `https://micheldumontier.github.io/dinner-tinder/`.
(The Pages build uses the mock backend; the real `server/` needs a host.)

## Suggested next steps (not yet done)

1. **Deploy the real backend** — host `server/` (Render/Fly/Railway/etc.) and
   set `VITE_API_URL` so the Pages site is cross-device too. Add persistence
   (swap the in-memory `Map` for a DB) if sessions should survive restarts.
2. **Live recipe API** — replace `fetchRecipes()` in `recipeApi.ts` with a real
   TheMealDB call (`filter.php?c=` / `randomselection.php`).
3. **Auth** — the current "login" is just a name; add real accounts if desired.
4. **Richer feedback** — surface the per-dish breakdown live during swiping, or
   show which member liked what.

## Run it

```bash
npm install
npm run dev        # mock backend; open a 2nd tab to play as a 2nd person
npm test           # all unit + backend integration tests
npm run build      # type-check + production build

# real cross-device backend (same machine):
npm run server                                   # API on :8787
VITE_API_URL=http://localhost:8787 npm run dev   # client → server

# real cross-device backend (LAN — phones too):
npm run server                                   # API on 0.0.0.0:8787
npm run dev:lan                                  # client on 0.0.0.0:5180, VITE_API_URL=auto
# host:  http://localhost:5180/    phones: http://<LAN-IP>:5180/
```

On WSL2 you'll need to open inbound on ports 5180 + 8787 in both the
Hyper-V firewall and Windows Defender Firewall before phones can connect —
see the README for the PowerShell commands.
