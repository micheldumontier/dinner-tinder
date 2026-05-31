// Deterministic tests for the WebRTC backend's host broker-reconnection — the
// behaviour that keeps a party joinable after the host backgrounds the tab to
// share the invite link (mobile suspends the tab, dropping PeerJS's socket).
//
// PeerJS is mocked with an in-process fake broker so we can simulate socket
// drops, tab suspension, and foreground resumes without a real network.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  type Handler = (...args: any[]) => void;

  class Emitter {
    private listeners: Record<string, Handler[]> = {};
    on(event: string, cb: Handler) {
      (this.listeners[event] ||= []).push(cb);
      return this;
    }
    once(event: string, cb: Handler) {
      const wrap: Handler = (...args) => {
        this.off(event, wrap);
        cb(...args);
      };
      return this.on(event, wrap);
    }
    off(event: string, cb: Handler) {
      this.listeners[event] = (this.listeners[event] || []).filter((f) => f !== cb);
      return this;
    }
    emit(event: string, ...args: any[]) {
      (this.listeners[event] || []).slice().forEach((f) => f(...args));
    }
  }

  /** id → live FakePeer registered with the broker. */
  const registry = new Map<string, any>();

  class FakeConn extends Emitter {
    open = false;
    peer: string;
    _remote: FakeConn | null = null;
    constructor(remoteId: string) {
      super();
      this.peer = remoteId;
    }
    send(data: unknown) {
      const remote = this._remote;
      if (!remote) return;
      const clone = JSON.parse(JSON.stringify(data));
      setTimeout(() => remote.emit("data", clone), 0);
    }
    close() {
      this.open = false;
      this.emit("close");
    }
  }

  class FakePeer extends Emitter {
    id: string;
    open = false;
    disconnected = false;
    destroyed = false;
    constructor(id?: string) {
      super();
      this.id = id ?? "peer-" + Math.random().toString(36).slice(2, 10);
      setTimeout(() => {
        if (this.destroyed) return;
        if (id && registry.has(id)) {
          this.emit("error", { type: "unavailable-id" });
          this.destroyed = true;
          return;
        }
        registry.set(this.id, this);
        this.open = true;
        this.emit("open", this.id);
      }, 0);
    }
    connect(targetId: string) {
      const local = new FakeConn(targetId);
      setTimeout(() => {
        if (this.destroyed) return;
        const target = registry.get(targetId);
        if (target && target.open && !target.disconnected) {
          const remote = new FakeConn(this.id);
          local._remote = remote;
          remote._remote = local;
          target.emit("connection", remote);
          setTimeout(() => {
            local.open = true;
            remote.open = true;
            remote.emit("open");
            local.emit("open");
          }, 0);
        } else {
          this.emit("error", { type: "peer-unavailable" });
        }
      }, 0);
      return local;
    }
    reconnect() {
      if (this.destroyed || !this.disconnected) return;
      this.disconnected = false;
      this.open = true;
      registry.set(this.id, this);
    }
    destroy() {
      this.destroyed = true;
      this.open = false;
      registry.delete(this.id);
    }
    /** Broker socket drops while the tab is alive (e.g. a wifi flip). */
    _simulateDisconnect() {
      if (this.destroyed) return;
      this.disconnected = true;
      this.open = false;
      registry.delete(this.id);
      this.emit("disconnected");
    }
    /** Frozen mobile tab: socket dropped, but JS couldn't run to react. */
    _freeze() {
      this.disconnected = true;
      this.open = false;
      registry.delete(this.id);
    }
  }

  return { registry, FakePeer };
});

vi.mock("peerjs", () => ({ Peer: h.FakePeer }));

import { createSession } from "./sessionApi.webrtc";

const PREFIX = "dinnermatch-";

async function makeHost(name = "Ann") {
  const pending = createSession(name);
  await vi.advanceTimersByTimeAsync(20);
  return pending;
}

describe("webrtc host broker reconnection", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    // Reset any per-test visibility override.
    delete (document as unknown as { visibilityState?: unknown }).visibilityState;
  });

  it("registers the host peer with the broker on create", async () => {
    const { session } = await makeHost();
    const peer = h.registry.get(PREFIX + session.code);
    expect(peer).toBeTruthy();
    expect(peer.open).toBe(true);
  });

  it("auto-reconnects after a transient broker disconnect (wifi flip)", async () => {
    const { session } = await makeHost();
    const id = PREFIX + session.code;
    const peer = h.registry.get(id);

    peer._simulateDisconnect();

    // The disconnected handler reconnects synchronously, so the host stays
    // discoverable for new joiners.
    expect(peer.disconnected).toBe(false);
    expect(h.registry.get(id)).toBe(peer);
  });

  it("re-registers a suspended host when the tab returns to the foreground", async () => {
    const { session } = await makeHost();
    const id = PREFIX + session.code;
    const peer = h.registry.get(id);

    // Mimic the real bug: the tab was frozen while the host shared the link,
    // so the socket dropped but no handler could run.
    peer._freeze();
    expect(h.registry.has(id)).toBe(false);

    // Switching back to DinnerMatch fires visibilitychange while visible.
    document.dispatchEvent(new Event("visibilitychange"));

    expect(peer.disconnected).toBe(false);
    expect(h.registry.get(id)).toBe(peer);
  });

  it("does not reconnect while the tab is still hidden", async () => {
    const { session } = await makeHost();
    const id = PREFIX + session.code;
    const peer = h.registry.get(id);

    peer._freeze();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });

    document.dispatchEvent(new Event("visibilitychange"));

    expect(h.registry.has(id)).toBe(false); // still unreachable until visible
  });

  it("never reconnects a destroyed peer", async () => {
    const { session } = await makeHost();
    const id = PREFIX + session.code;
    const peer = h.registry.get(id);

    peer.destroy();
    document.dispatchEvent(new Event("visibilitychange"));

    expect(peer.destroyed).toBe(true);
    expect(h.registry.has(id)).toBe(false);
  });
});
