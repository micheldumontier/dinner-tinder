// Real-cross-device backend WITHOUT a server: WebRTC peer-to-peer.
//
// The host's browser holds the canonical session state in memory and acts as
// the authoritative coordinator. Joiners discover the host via the PeerJS
// public broker (free, run by the PeerJS project), then talk to the host over
// an `RTCDataChannel`. Joiner actions are sent to the host; the host applies
// them and broadcasts the new state back to every connected joiner.
//
// This adapter implements exactly the same surface as `sessionApi.local.ts`
// and `sessionApi.http.ts`, so the UI and funnel logic don't change.
//
// Known limitations of this prototype:
//   - State is purely in-memory; if the host closes their tab, the party dies.
//   - On a joiner reload, identity is preserved in localStorage but the live
//     connection is lost — App.tsx's "Loading party…" screen lets them tap
//     "Start over" to clear identity and re-join.
//   - WebRTC connectivity sometimes fails behind restrictive NATs without a
//     TURN relay; for the PeerJS defaults that's a STUN-only setup.

import { Peer, type DataConnection } from "peerjs";
import type { Member, Session } from "./types";
import { hasFinishedSwiping } from "../lib/funnel";
import { SessionError, type SessionListener as Listener } from "./sessionApi.shared";

export { SessionError };

const PEER_PREFIX = "dinnermatch-";
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REQUEST_TIMEOUT_MS = 8000;
const PEER_OPEN_TIMEOUT_MS = 10000;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// --- Instance bookkeeping ---------------------------------------------------

interface HostInstance {
  role: "host";
  code: string;
  peer: Peer;
  /** conn → memberId once the joiner has identified themselves. */
  connections: Map<DataConnection, string | null>;
  session: Session;
  listeners: Set<Listener>;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface JoinerInstance {
  role: "joiner";
  code: string;
  peer: Peer;
  conn: DataConnection;
  /** Resolves when the DataChannel is open and ready to send. */
  ready: Promise<void>;
  lastSession: Session | null;
  listeners: Set<Listener>;
  pending: Map<number, PendingRequest>;
  nextReqId: number;
}

const instances = new Map<string, HostInstance | JoinerInstance>();

function notify(inst: HostInstance | JoinerInstance, session: Session) {
  // Listeners are React setState calls; pass a fresh reference or React skips
  // the re-render.
  const snapshot = clone(session);
  inst.listeners.forEach((cb) => cb(snapshot));
}

function broadcastFromHost(host: HostInstance) {
  notify(host, host.session);
  const frame = { type: "state", session: host.session };
  host.connections.forEach((_memberId, conn) => {
    if (conn.open) {
      try {
        conn.send(frame);
      } catch {
        // ignore — the conn's close/error handler will tidy up
      }
    }
  });
}

/**
 * Re-register a host's peer with the broker after its socket dropped. Guarded
 * so we only ever call `reconnect()` in the one state PeerJS allows it
 * (disconnected but not destroyed); any stray error is swallowed by the host's
 * no-op error handler rather than cascading into the session. Established data
 * channels are peer-to-peer and survive a broker drop untouched — this only
 * restores the host's discoverability for *new* joiners.
 */
function reconnectHostBroker(host: HostInstance) {
  const { peer } = host;
  if (peer.destroyed || !peer.disconnected) return;
  try {
    peer.reconnect();
  } catch {
    // ignore
  }
}

let foregroundReconnectAttached = false;
/**
 * Once any host exists in this tab, reconnect every live host peer to the
 * broker whenever the page returns to the foreground or the network comes
 * back. This is what recovers a party after the host backgrounds the tab to
 * share the invite link: mobile freezes a backgrounded tab, silently dropping
 * PeerJS's socket, and the frozen tab can't react until it's resumed — so the
 * `visibilitychange`/`focus` resume is the moment we re-register.
 */
function ensureForegroundReconnect() {
  if (foregroundReconnectAttached || typeof window === "undefined") return;
  foregroundReconnectAttached = true;
  const reconnectAllHosts = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return; // wait until we're actually visible again
    }
    for (const inst of instances.values()) {
      if (inst.role === "host") reconnectHostBroker(inst);
    }
  };
  window.addEventListener("focus", reconnectAllHosts);
  window.addEventListener("online", reconnectAllHosts);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", reconnectAllHosts);
  }
}

// --- createSession ----------------------------------------------------------

export async function createSession(
  hostName: string,
): Promise<{ session: Session; member: Member }> {
  const name = hostName.trim();
  if (!name) throw new SessionError("Please enter your name.");

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      const host = await openHostPeer(code);
      const hostMember: Member = {
        id: randomId(),
        name,
        order: 0,
        status: "waiting",
      };
      host.session = {
        code,
        hostId: hostMember.id,
        phase: "lobby",
        members: [hostMember],
        recipeIds: [],
        swipes: [],
        createdAt: Date.now(),
      };
      attachHostHandlers(host);
      instances.set(code, host);
      return { session: clone(host.session), member: hostMember };
    } catch (err) {
      if (err instanceof SessionError && err.message === "__id_taken__") continue;
      throw err;
    }
  }
  throw new SessionError("Couldn't allocate a party code. Try again.");
}

function openHostPeer(code: string): Promise<HostInstance> {
  return new Promise((resolve, reject) => {
    const peer = new Peer(`${PEER_PREFIX}${code}`);
    const timeout = window.setTimeout(() => {
      peer.destroy();
      reject(new SessionError("Couldn't reach the PeerJS broker. Try again."));
    }, PEER_OPEN_TIMEOUT_MS);

    peer.once("open", () => {
      window.clearTimeout(timeout);
      resolve({
        role: "host",
        code,
        peer,
        connections: new Map(),
        // Filled in by the caller; placeholder satisfies the type.
        session: undefined as unknown as Session,
        listeners: new Set(),
      });
    });
    peer.once("error", (err: { type?: string; message?: string }) => {
      window.clearTimeout(timeout);
      peer.destroy();
      if (err.type === "unavailable-id") {
        reject(new SessionError("__id_taken__"));
      } else {
        reject(new SessionError(`PeerJS error: ${err.message ?? err.type ?? "unknown"}`));
      }
    });
  });
}

function attachHostHandlers(host: HostInstance) {
  // Persistent error handler so an error after openHostPeer's once("error")
  // doesn't propagate as an unhandled EventEmitter event (which in PeerJS
  // can destroy the peer). We can't recover most errors at this level — but
  // we can keep them from cascading into the React layer.
  host.peer.on("error", () => {});

  // Keep the host reachable across broker drops (e.g. a wifi flip, or the tab
  // being suspended while the host switches apps to share the invite link).
  // Without this the host's peer ID disappears from the broker and new guests
  // fail with `peer-unavailable`. See reconnectHostBroker for the safety
  // guards that avoid the cascade that got an earlier version reverted.
  host.peer.on("disconnected", () => reconnectHostBroker(host));
  ensureForegroundReconnect();

  host.peer.on("connection", (conn) => {
    host.connections.set(conn, null);
    conn.on("open", () => {
      // Snapshot the current state to the new joiner so they're in sync from
      // the moment the channel opens.
      try {
        conn.send({ type: "state", session: host.session });
      } catch {
        // ignore
      }
    });
    conn.on("data", (data: unknown) => handleHostRequest(host, conn, data));
    conn.on("close", () => host.connections.delete(conn));
    conn.on("error", () => host.connections.delete(conn));
  });
}

type Op = "join" | "getSession" | "startSwiping" | "submitSwipe" | "endSession" | "playAgain";

interface RequestFrame {
  type: "request";
  id: number;
  op: Op;
  payload: unknown;
}

function isRequest(data: unknown): data is RequestFrame {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === "request"
  );
}

function handleHostRequest(host: HostInstance, conn: DataConnection, data: unknown) {
  if (!isRequest(data)) return;
  const { id, op, payload } = data;
  try {
    let result: unknown = null;
    if (op === "join") {
      const member = doJoin(host, (payload as { name?: unknown })?.name);
      host.connections.set(conn, member.id);
      result = { session: host.session, member };
    } else if (op === "getSession") {
      result = host.session;
    } else if (op === "startSwiping") {
      doStartSwiping(host, (payload as { recipeIds?: unknown })?.recipeIds);
      result = host.session;
    } else if (op === "submitSwipe") {
      const p = payload as { memberId?: unknown; recipeId?: unknown; liked?: unknown };
      doSubmitSwipe(host, p?.memberId, p?.recipeId, p?.liked);
      result = host.session;
    } else if (op === "endSession") {
      doEndSession(host);
      result = host.session;
    } else if (op === "playAgain") {
      doPlayAgain(host);
      result = host.session;
    } else {
      throw new SessionError(`Unknown op: ${String(op)}`);
    }
    conn.send({ type: "response", id, ok: true, data: result });
    broadcastFromHost(host);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    conn.send({ type: "response", id, ok: false, error: message });
  }
}

// --- State mutations (run on the host) --------------------------------------

function doJoin(host: HostInstance, rawName: unknown): Member {
  const name = String(rawName ?? "").trim();
  if (!name) throw new SessionError("Please enter your name.");
  if (host.session.phase === "results") {
    throw new SessionError("That party has already finished.");
  }
  if (
    host.session.members.some(
      (m) => m.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    throw new SessionError(`"${name}" is already in this party.`);
  }
  const member: Member = {
    id: randomId(),
    name,
    order: host.session.members.length,
    status: host.session.phase === "swiping" ? "active" : "waiting",
  };
  host.session.members.push(member);
  return member;
}

function doStartSwiping(host: HostInstance, rawRecipeIds: unknown) {
  if (host.session.phase !== "lobby") return;
  if (!Array.isArray(rawRecipeIds) || rawRecipeIds.length === 0) {
    throw new SessionError("No recipes loaded yet.");
  }
  host.session.recipeIds = rawRecipeIds.map((id) => String(id));
  host.session.phase = "swiping";
  host.session.members.forEach((m) => (m.status = "active"));
}

function doSubmitSwipe(
  host: HostInstance,
  rawMemberId: unknown,
  rawRecipeId: unknown,
  rawLiked: unknown,
) {
  if (host.session.phase !== "swiping") {
    throw new SessionError("This party isn't accepting swipes right now.");
  }
  const memberId = String(rawMemberId);
  const recipeId = String(rawRecipeId);
  const liked = Boolean(rawLiked);
  const member = host.session.members.find((m) => m.id === memberId);
  if (!member) throw new SessionError("Unknown member for this session.");

  const existing = host.session.swipes.find(
    (s) => s.memberId === memberId && s.recipeId === recipeId,
  );
  if (existing) {
    existing.liked = liked;
  } else {
    host.session.swipes.push({ memberId, recipeId, liked });
  }
  if (hasFinishedSwiping(host.session, member)) {
    member.status = "done";
  }
  // No auto-end: only the host's explicit endSession() moves to results.
}

function doEndSession(host: HostInstance) {
  if (host.session.phase !== "swiping") return;
  host.session.phase = "results";
  host.session.members.forEach((m) => (m.status = "done"));
}

function doPlayAgain(host: HostInstance) {
  host.session.phase = "lobby";
  host.session.swipes = [];
  host.session.recipeIds = [];
  host.session.members.forEach((m) => (m.status = "waiting"));
}

// --- joinSession ------------------------------------------------------------

export async function joinSession(
  code: string,
  memberName: string,
): Promise<{ session: Session; member: Member }> {
  const upper = code.trim().toUpperCase();
  const name = memberName.trim();
  if (!name) throw new SessionError("Please enter your name.");

  // If we already host this party (e.g. a second tab join), apply locally.
  const existing = instances.get(upper);
  if (existing?.role === "host") {
    const member = doJoin(existing, name);
    broadcastFromHost(existing);
    return { session: clone(existing.session), member };
  }

  const joiner = await openJoinerPeer(upper);
  instances.set(upper, joiner);
  const result = await sendRequest<{ session: Session; member: Member }>(
    joiner,
    "join",
    { name },
  );
  joiner.lastSession = result.session;
  return result;
}

/**
 * The PeerJS broker returns `peer-unavailable` for a host it can't currently
 * resolve — which happens not just for a genuinely-closed party, but also
 * while the host's peer is still propagating through the broker, or while the
 * host's tab is briefly suspended (e.g. they switched apps to share the invite
 * link). So we keep retrying for a generous window rather than giving up after
 * a couple of seconds: paired with the host's foreground-reconnect, this lets
 * a guest who taps the link wait out the host's app-switch and connect the
 * moment the host returns to DinnerMatch.
 */
const JOIN_TOTAL_BUDGET_MS = 45_000;
const JOIN_RETRY_DELAY_MS = 2_000;
const JOIN_ATTEMPT_TIMEOUT_MS = 4_000;

function openJoinerPeer(code: string): Promise<JoinerInstance> {
  return new Promise((resolve, reject) => {
    const peer = new Peer();
    let settled = false;
    let activeConn: DataConnection | null = null;
    let attemptTimer: number | null = null;
    let retryTimer: number | null = null;
    const deadline = Date.now() + JOIN_TOTAL_BUDGET_MS;

    const clearAttemptTimer = () => {
      if (attemptTimer !== null) {
        window.clearTimeout(attemptTimer);
        attemptTimer = null;
      }
    };
    const clearTimers = () => {
      clearAttemptTimer();
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const fail = (err: SessionError) => {
      if (settled) return;
      settled = true;
      clearTimers();
      peer.destroy();
      reject(err);
    };
    const succeed = (joiner: JoinerInstance) => {
      if (settled) return;
      settled = true;
      clearTimers();
      resolve(joiner);
    };

    const openTimeout = window.setTimeout(
      () => fail(new SessionError("Couldn't reach the PeerJS broker. Try again.")),
      PEER_OPEN_TIMEOUT_MS,
    );

    // Schedule exactly one retry (guarded against the peer-unavailable error
    // and the per-attempt timeout both firing for the same attempt), or give
    // up once we've exhausted the overall budget.
    function scheduleRetry() {
      if (settled || retryTimer !== null) return;
      clearAttemptTimer();
      if (Date.now() >= deadline) {
        fail(
          new SessionError(
            `Couldn't find a party with code "${code}". Make sure the host still has DinnerMatch open on their screen, then tap Join again.`,
          ),
        );
        return;
      }
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        tryConnect();
      }, JOIN_RETRY_DELAY_MS);
    }

    function tryConnect() {
      if (settled) return;
      // Tidy up the previous attempt so its timer/handlers don't bleed over.
      clearAttemptTimer();
      if (activeConn && !activeConn.open) {
        try {
          activeConn.close();
        } catch {
          // ignore
        }
      }

      const conn = peer.connect(`${PEER_PREFIX}${code}`, { reliable: true });
      activeConn = conn;
      const ready = new Promise<void>((r) => conn.on("open", () => r()));

      const joiner: JoinerInstance = {
        role: "joiner",
        code,
        peer,
        conn,
        ready,
        lastSession: null,
        listeners: new Set(),
        pending: new Map(),
        nextReqId: 1,
      };

      // Safety net: if neither `open` nor a peer-level error fires within the
      // per-attempt window, treat the attempt as failed and retry.
      attemptTimer = window.setTimeout(() => {
        attemptTimer = null;
        if (settled || conn.open) return;
        try {
          conn.close();
        } catch {
          // ignore
        }
        scheduleRetry();
      }, JOIN_ATTEMPT_TIMEOUT_MS);

      conn.once("open", () => succeed(joiner));
      conn.on("data", (data: unknown) => handleJoinerMessage(joiner, data));
      conn.on("close", () => {
        joiner.pending.forEach(({ reject }) =>
          reject(new SessionError("Lost connection to the party.")),
        );
        joiner.pending.clear();
      });
      // The peer-level error handler decides whether to retry on
      // peer-unavailable. Swallow the conn-level event so it doesn't crash
      // PeerJS's unhandled-error path.
      conn.on("error", () => {});
    }

    peer.once("open", () => {
      window.clearTimeout(openTimeout);
      tryConnect();
    });

    peer.on("error", (err: { type?: string; message?: string }) => {
      if (err.type === "peer-unavailable") {
        scheduleRetry();
      } else if (!settled) {
        window.clearTimeout(openTimeout);
        fail(new SessionError(`PeerJS error: ${err.message ?? err.type ?? "unknown"}`));
      }
    });
  });
}

function handleJoinerMessage(joiner: JoinerInstance, data: unknown) {
  if (typeof data !== "object" || data === null) return;
  const frame = data as { type?: string };
  if (frame.type === "state") {
    const session = (data as { session: Session }).session;
    joiner.lastSession = session;
    notify(joiner, session);
  } else if (frame.type === "response") {
    const r = data as { id: number; ok: boolean; data?: unknown; error?: string };
    const pending = joiner.pending.get(r.id);
    if (!pending) return;
    joiner.pending.delete(r.id);
    if (r.ok) pending.resolve(r.data);
    else pending.reject(new SessionError(r.error ?? "Action failed."));
  }
}

function sendRequest<T>(joiner: JoinerInstance, op: Op, payload: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    joiner.ready
      .then(() => {
        if (!joiner.conn.open) {
          reject(new SessionError("Lost connection to the party."));
          return;
        }
        const id = joiner.nextReqId++;
        joiner.pending.set(id, {
          resolve: resolve as (value: unknown) => void,
          reject,
        });
        try {
          joiner.conn.send({ type: "request", id, op, payload });
        } catch (err) {
          joiner.pending.delete(id);
          reject(err instanceof Error ? err : new SessionError(String(err)));
          return;
        }
        window.setTimeout(() => {
          if (joiner.pending.has(id)) {
            joiner.pending.delete(id);
            reject(new SessionError("Request timed out."));
          }
        }, REQUEST_TIMEOUT_MS);
      })
      .catch((err: Error) => reject(err));
  });
}

// --- Other public API -------------------------------------------------------

export async function getSession(code: string): Promise<Session> {
  const upper = code.trim().toUpperCase();
  const inst = instances.get(upper);
  if (!inst) throw new SessionError(`No session found with code "${upper}".`);
  if (inst.role === "host") return clone(inst.session);
  if (inst.lastSession) return clone(inst.lastSession);
  return sendRequest<Session>(inst, "getSession", {});
}

async function actionAsJoiner(
  code: string,
  op: Op,
  payload: unknown,
): Promise<Session> {
  const inst = instances.get(code.toUpperCase());
  if (!inst) throw new SessionError(`No session found with code "${code}".`);
  if (inst.role !== "joiner") {
    throw new SessionError("Wrong role for this action.");
  }
  return sendRequest<Session>(inst, op, payload);
}

export async function startSwiping(
  code: string,
  recipeIds: string[],
): Promise<Session> {
  const upper = code.toUpperCase();
  const inst = instances.get(upper);
  if (inst?.role === "host") {
    doStartSwiping(inst, recipeIds);
    broadcastFromHost(inst);
    return clone(inst.session);
  }
  return actionAsJoiner(code, "startSwiping", { recipeIds });
}

export async function submitSwipe(
  code: string,
  memberId: string,
  recipeId: string,
  liked: boolean,
): Promise<Session> {
  const upper = code.toUpperCase();
  const inst = instances.get(upper);
  if (inst?.role === "host") {
    doSubmitSwipe(inst, memberId, recipeId, liked);
    broadcastFromHost(inst);
    return clone(inst.session);
  }
  return actionAsJoiner(code, "submitSwipe", { memberId, recipeId, liked });
}

export async function endSession(code: string): Promise<Session> {
  const upper = code.toUpperCase();
  const inst = instances.get(upper);
  if (inst?.role === "host") {
    doEndSession(inst);
    broadcastFromHost(inst);
    return clone(inst.session);
  }
  return actionAsJoiner(code, "endSession", {});
}

export async function playAgain(code: string): Promise<Session> {
  const upper = code.toUpperCase();
  const inst = instances.get(upper);
  if (inst?.role === "host") {
    doPlayAgain(inst);
    broadcastFromHost(inst);
    return clone(inst.session);
  }
  return actionAsJoiner(code, "playAgain", {});
}

export function subscribe(code: string, onChange: Listener): () => void {
  const upper = code.toUpperCase();
  const inst = instances.get(upper);
  if (!inst) return () => {};
  inst.listeners.add(onChange);
  return () => {
    inst.listeners.delete(onChange);
  };
}
