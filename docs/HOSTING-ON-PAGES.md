# Hosting the entire app on GitHub Pages — exploration

> **Status:** Option 1 (WebRTC + PeerJS) is implemented. The Pages deploy at
> [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) now sets
> `VITE_BACKEND=webrtc`, so the published bundle uses peer-to-peer instead
> of the Express server. The adapter lives at
> [`src/api/sessionApi.webrtc.ts`](../src/api/sessionApi.webrtc.ts).

## The constraint

GitHub Pages serves **only static files**. There is no server-side compute, no
WebSocket termination, no scheduled job runner. Anything that needs persistent,
cross-device shared state has to live somewhere else and the static client has
to reach it from the browser.

So the literal question — *"can I host the entire app, including the API
server, on GitHub Pages?"* — has a literal answer of **no**. The interesting
question is what comes closest, and the architecture here makes it easy to
swap backends without touching the UI.

## Where we already are

The Pages deploy at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
already builds and publishes the client. With `VITE_API_URL` unset, the app
falls back to [`sessionApi.local.ts`](../src/api/sessionApi.local.ts), which
keeps every session in `localStorage` and syncs across **browser tabs of the
same origin**.

That means the app at `https://<user>.github.io/dinner-tinder/` already works
end-to-end — just only for "two tabs on one device" parties. Real cross-device
play needs shared state that lives outside the browser.

## Options ranked

The seam to extend is the facade in [`sessionApi.ts`](../src/api/sessionApi.ts):
add one more `sessionApi.X.ts` adapter implementing the same surface
(`createSession`, `joinSession`, `getSession`, `startSwiping`, `submitSwipe`,
`endSession`, `playAgain`, `subscribe`), and the rest of the codebase doesn't
change.

### 1. WebRTC peer-to-peer (closest to "pure Pages")

**Idea.** The host device owns the canonical session state in memory. Joiners
discover the host via a small public signalling server, then talk to the host
directly over a WebRTC `RTCDataChannel`. The static Pages bundle includes
everything needed; no app-owned server.

- **Signalling** — needs *some* broker. Free options: the public PeerJS
  broker (`0.peerjs.com`), or `y-webrtc` signalling servers. These aren't
  ours, but they're not ours to host either.
- **Pros** — no SaaS account, no per-session cost, no DB. Feels truly serverless.
- **Cons** —
  - NAT traversal sometimes fails; reliable connectivity needs a TURN relay,
    which is usually paid (e.g. Twilio, Cloudflare TURN).
  - If the host's device goes to sleep / closes the tab, the party dies. We'd
    need leader-election or "any client can be promoted to host" logic.
  - The host's browser becomes load-bearing; the host has to stay open.
  - Corporate / school networks block WebRTC pretty often.
- **Effort** — moderate. ~200–300 LOC for an adapter using `peerjs` or
  `y-webrtc` + a tiny in-memory state machine on the host side.

### 2. Firebase Realtime Database (most reliable free option)

**Idea.** Use Firebase Realtime Database (or Firestore) as the shared store.
Client SDK only — no app-owned server. Security rules constrain reads/writes
to the session document.

- **Pros** —
  - Genuine realtime sync; works through NATs, mobile networks, corp firewalls.
  - Free tier (Spark plan) is plenty for hobby use.
  - No signalling weirdness; the SDK handles connectivity.
- **Cons** —
  - Vendor lock to Google; the project gets a Firebase config baked into the
    bundle. (API keys are public by design; security rules do the real work.)
  - Anonymous auth is fine for a dinner-picker, but you'll want rules that
    prevent vandals from rewriting other people's sessions.
- **Effort** — small. ~150 LOC adapter. Provisioning Firebase is a 5-minute UI
  task once.

### 3. Supabase Realtime

**Idea.** Same shape as Firebase — client SDK, postgres-backed realtime —
but open source.

- **Pros** — open source; portable; can self-host later.
- **Cons** — same vendor-bound config-in-bundle story; slightly more setup
  than Firebase.
- **Effort** — similar to Firebase. ~150 LOC adapter.

### 4. A purpose-built realtime service (PartyKit, Ably, Pusher, Liveblocks)

**Idea.** Use a free-tier realtime/WebSocket service. PartyKit is particularly
on-brand — its programming model is literally "one party = one durable object".

- **Pros** — minimal adapter, scales beyond a hobby usage if needed.
- **Cons** — yet another account; some have stricter free-tier limits.
- **Effort** — small. ~150 LOC adapter.

### 5. Host the existing `server/` somewhere free

**Idea.** Keep the current Express + SSE backend; host it on Render, Fly,
Railway, or Cloudflare Workers (with a small rewrite); leave the Pages client
pointed at it via `VITE_API_URL`.

- **Pros** — zero code change to the app; the existing
  [`sessionApi.http.ts`](../src/api/sessionApi.http.ts) already does this.
- **Cons** — that's not "host the whole thing on Pages" — the API lives
  elsewhere. Free tiers come with sleep/cold-start.
- **Effort** — basically none on the app side; just an account + a deploy.

## Recommendation

If the goal is **"feels like the app is fully on Pages"** with minimum running
parts, go with **option 1 (WebRTC + PeerJS signalling)**. The adapter is
self-contained, no SaaS account is needed for the common case, and the static
bundle on Pages is genuinely everything the user runs. Accept the caveats
(host has to stay online; some networks block WebRTC) and document them.

If the goal is **"the app works reliably for anyone, anywhere"** and you'd
rather not chase WebRTC edge cases, go with **option 2 (Firebase Realtime
Database)**. The bundle stays on Pages, the data lives in Google's free tier,
and the rest of the app doesn't change.

Options 3 and 4 are reasonable substitutes for option 2 if you want to avoid
Google specifically.

## What "doing it" looks like in this codebase

For any of the above, the work is the same shape:

1. **New adapter file** — e.g. `src/api/sessionApi.webrtc.ts` or
   `sessionApi.firebase.ts`, exporting the same surface as
   [`sessionApi.local.ts`](../src/api/sessionApi.local.ts).
   The pure funnel logic in [`src/lib/funnel.ts`](../src/lib/funnel.ts) stays
   imported as-is, so the rules can't drift between adapters.
2. **Facade switch** — extend [`sessionApi.ts`](../src/api/sessionApi.ts) to
   pick the new adapter via a new env var (e.g. `VITE_BACKEND=webrtc`).
3. **Deploy workflow** — add the env var to
   [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) so the
   Pages build picks it up. No server-side change needed.
4. **Docs** — point [README.md](../README.md) at the new "cross-device on
   Pages" path; keep the Express server as the local-dev backend.

The UI components and the funnel logic don't change at all — the existing
seam in `sessionApi.ts` was built exactly for this.

## What I'd do next

If you want to actually pursue this, the next concrete step is:

1. Pick **one** option to prototype (my pick: WebRTC for the pure-Pages
   feeling, or Firebase if you want it to "just work").
2. Scaffold the new adapter file with stub implementations that throw, plus a
   small test that imports the same `funnel.ts` to confirm the wiring.
3. Implement `createSession` + `joinSession` + `subscribe` first; once two
   browsers can see each other, the rest of the surface is mechanical.

This doc stops there — flesh it out on a follow-up branch once the option is
chosen.
