# DinnerMatch 🍽️

A Tinder-style group picker for deciding **what to make for dinner tonight**.

Everyone joins a shared party, then swipes through recipes one person at a time.
Each person only sees the recipes the previous person liked, so the deck funnels
down to the meals the **whole party** is happy with.

## How it works

1. **Start a party** — the host gets a 4-letter party code.
2. **Join** — everyone else enters that code on their own device (or another
   browser tab) and adds their name.
3. **Host hits Start** — a deck of recipes is preloaded.
4. **Swipe in turns:**
   - The first person sees the **full deck** and swipes 👈 nope / 👉 yum.
   - The next person sees **only what the previous person liked**, and narrows
     it further.
   - …and so on, down the line.
5. **Results** — whatever survives everyone's swipes is tonight's dinner, shown
   to the whole party. Ties? You get a ranked shortlist.

Before the host starts, they can **narrow the menu** by cuisine, category, or a
vegetarian-only toggle. After the game, the results screen has a **per-dish
breakdown** showing how many people liked each recipe and exactly where it
dropped out of the funnel.

## Run it

```bash
cd dinner-tinder
npm install
npm run dev          # open the printed URL
```

By default the app uses the **localStorage mock backend** — open it in **two
browser tabs** to simulate two people on separate devices; they share the same
party in real time within one browser.

```bash
npm test             # run all unit + backend integration tests
npm run build        # type-check + production build
```

### Real cross-device play (the live backend)

To have genuinely separate devices share a party, run the bundled server and
point the client at it:

```bash
# terminal 1 — the API server (in-memory, REST + Server-Sent Events)
npm run server                       # listens on http://localhost:8787

# terminal 2 — the client, talking to that server
VITE_API_URL=http://localhost:8787 npm run dev
```

Now phones/laptops on the same network can join the same code and swipe in
real time. Copy `.env.example` to `.env` to set `VITE_API_URL` permanently.

## Architecture

The app is built so the **mock layer can be swapped for a real backend** without
touching the UI. The session API is a small facade that picks its implementation
from `VITE_API_URL`:

| Module | Responsibility |
|---|---|
| `src/api/recipeApi.ts` | Mock external recipe API (TheMealDB-shaped) — swap for a real `fetch()` |
| `src/api/sessionApi.ts` | Facade: chooses the backend based on `VITE_API_URL` |
| `src/api/sessionApi.local.ts` | Mock backend over `localStorage` + cross-tab sync (default) |
| `src/api/sessionApi.http.ts` | Real backend client: REST + SSE |
| `src/api/types.ts` | Shared domain contract |
| `src/lib/funnel.ts` | Pure, tested swipe-funnel logic (+ per-recipe outcomes) |
| `src/lib/filters.ts` | Pure, tested lobby filtering |
| `src/components/*` | React UI (Login → Lobby → SwipeDeck → Results) |
| `server/` | Express server: in-memory store, REST routes, SSE stream |

Both backends implement the **same function surface** and reuse the **same
`funnel.ts`** for turn advancement, so the mock and the real server can never
drift in behaviour. The server keeps sessions in memory (a clean seam to later
drop in a database) and pushes every change to subscribers over SSE.
