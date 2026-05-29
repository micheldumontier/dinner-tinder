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

## Run it

```bash
cd dinner-tinder
npm install
npm run dev          # open the printed URL
```

Open the app in **two browser tabs** to simulate two people on separate devices —
they share the same party in real time.

```bash
npm test             # run the funnel logic unit tests
npm run build        # type-check + production build
```

## Architecture

The app is built so the **mock layer can be swapped for a real backend** without
touching the UI:

| Module | Responsibility | Swap for production |
|---|---|---|
| `src/api/recipeApi.ts` | Mock external recipe API (TheMealDB-shaped) | A real `fetch()` to TheMealDB / your cookbook API |
| `src/api/sessionApi.ts` | Mock shared-session backend over `localStorage` + cross-tab sync | A REST/WebSocket backend |
| `src/api/types.ts` | Shared domain contract | (unchanged) |
| `src/lib/funnel.ts` | Pure, tested swipe-funnel logic | (unchanged) |
| `src/components/*` | React UI (Login → Lobby → SwipeDeck → Results) | (unchanged) |

Because "separate devices, shared session" is mocked with `localStorage`, the
shared state lives in the browser; multiple tabs of the same origin sync live
via the `storage` event. Point `sessionApi.ts` at a server to make it work
across real devices.
