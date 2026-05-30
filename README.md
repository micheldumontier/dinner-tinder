# DinnerMatch 🍽️

A Tinder-style group picker for deciding **what to make for dinner tonight**.

Everyone joins a shared party, then swipes through recipes one person at a time.
Each person only sees the recipes the previous person liked, so the deck funnels
down to the meals the **whole party** is happy with.

## How it works

1. **Start a party** — the host gets a 4-letter party code.
2. **Join** — everyone else enters that code on their own device (or another
   browser tab) and adds their name. **Late joiners are welcome** — you can join
   even after the host has started.
3. **Host hits Start** — a deck of recipes is preloaded.
4. **Everyone swipes at once.** Each person's queue is the full deck minus the
   recipes they've already voted on, **prioritised** so cards others have
   already voted on (but they haven't) come first — this drives the party
   toward consensus faster.
5. **End the round.** The host hits "End selection" when they're happy (or the
   round auto-ends once every joined member has voted on every recipe).
6. **Results.** Winners are the recipes that got at least one ♥ and zero ✕ —
   i.e. nobody who voted on it said no. Ranked by like count.

Before the host starts, they can **narrow the menu** by cuisine, category, or a
vegetarian-only toggle. After the game, the results screen has a **per-dish
breakdown** showing each recipe's like / dislike / didn't-vote counts.

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

### Cross-device play on GitHub Pages (no server, WebRTC)

The Pages-deployed bundle uses a **peer-to-peer WebRTC backend** instead of the
Express server: the host's browser holds the canonical session state, joiners
discover the host via the [PeerJS](https://peerjs.com/) public broker for
signalling, and everyone talks directly over `RTCDataChannel` after that.

Try it locally with the same backend:

```bash
VITE_BACKEND=webrtc npm run dev
```

Caveats of this mode:

- If the **host closes their tab, the party dies** — there's nowhere else to
  keep state.
- On a reload (host or joiner), the live connection is lost; the app shows
  "Loading party…" with a "Start over" link to clear identity.
- WebRTC needs a working STUN/TURN path — corporate / school networks
  sometimes block it. STUN comes free from PeerJS defaults; reliable TURN
  needs a paid relay if you hit a hostile NAT.

For local development with multiple tabs in one browser, the default
**localStorage mock** still works (omit `VITE_BACKEND`).

### Real cross-device play (the live backend)

To have genuinely separate devices share a party, run the bundled server and a
LAN-exposed client:

```bash
# terminal 1 — the API server (in-memory, REST + Server-Sent Events)
npm run server                       # listens on 0.0.0.0:8787

# terminal 2 — the client, exposed on the LAN with an auto-derived API URL
npm run dev:lan                      # vite --host on port 5180
```

`dev:lan` sets `VITE_API_URL=auto`, telling the client to derive the API base
from the page's hostname at runtime. The same dev server then works for:

- **Your host machine:** `http://localhost:5180/` → API at `localhost:8787`
- **Phones on the same Wi-Fi:** `http://<your-LAN-IP>:5180/` → API at `<your-LAN-IP>:8787`

Find your LAN IP with `hostname -I` (Linux/WSL) or `ipconfig` (Windows).

If you'd rather pin one URL for everyone (e.g. running the client on a server),
copy `.env.example` to `.env` and set `VITE_API_URL=http://host:port` instead.

#### WSL2 caveat: opening the firewall

On WSL2 with mirrored networking, phones on the LAN will get connection refused
until you allow inbound TCP on the two ports in **both** firewalls. In an
**elevated PowerShell**:

```powershell
# Hyper-V firewall (controls traffic into the WSL VM)
New-NetFirewallHyperVRule -Name "WSL-DinnerTinder-Client" -DisplayName "WSL DinnerMatch Client 5180" -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 5180
New-NetFirewallHyperVRule -Name "WSL-DinnerTinder-Server" -DisplayName "WSL DinnerMatch Server 8787" -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 8787

# Windows Defender Firewall (controls traffic to the Windows host itself)
New-NetFirewallRule -DisplayName "DinnerMatch Client 5180" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5180 -Profile Private,Domain
New-NetFirewallRule -DisplayName "DinnerMatch Server 8787" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8787 -Profile Private,Domain
```

If your Wi-Fi is classified `Public` (check with `Get-NetConnectionProfile`),
either reclassify it (`Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private`)
or add `Public` to the `-Profile` list on the two `New-NetFirewallRule` calls.

Also note: the Windows host **cannot** reach its own LAN IP for a service
listening in WSL — use `localhost:5180` on the host machine and the LAN IP only
from other devices.

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
