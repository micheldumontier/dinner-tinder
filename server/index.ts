// DinnerMatch real backend: a small Express server that holds sessions in
// memory and pushes live updates to every connected device over Server-Sent
// Events. Pair it with the client by setting VITE_API_URL to this server's URL.
//
//   npm run server          # starts on PORT (default 8787)
//   VITE_API_URL=http://localhost:8787 npm run dev   # client talks to it
//
// State is in-memory only (lost on restart) — perfect for a demo and a clean
// seam to later swap in a database without touching the routes.

import express, { type Request, type Response } from "express";
import cors from "cors";
import type { Session } from "../src/api/types";
import * as logic from "./sessionLogic";

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const sessions = new Map<string, Session>();
  const subscribers = new Map<string, Set<Response>>();

  function broadcast(code: string): void {
    const session = sessions.get(code);
    if (!session) return;
    const frame = `data: ${JSON.stringify(session)}\n\n`;
    subscribers.get(code)?.forEach((res) => res.write(frame));
  }

  function getOr404(code: string): Session {
    const session = sessions.get(code.toUpperCase());
    if (!session) throw new logic.SessionError(`No session found with code "${code}".`, 404);
    return session;
  }

  // Wrap a handler so thrown SessionErrors become tidy JSON responses.
  function handle(fn: (req: Request, res: Response) => void) {
    return (req: Request, res: Response) => {
      try {
        fn(req, res);
      } catch (err) {
        if (err instanceof logic.SessionError) {
          res.status(err.status).json({ error: err.message });
        } else {
          console.error(err);
          res.status(500).json({ error: "Internal server error." });
        }
      }
    };
  }

  app.get("/health", (_req, res) => res.json({ ok: true, sessions: sessions.size }));

  app.post(
    "/api/sessions",
    handle((req, res) => {
      const { session, member } = logic.createSession(
        String(req.body?.hostName ?? ""),
        (code) => sessions.has(code),
      );
      sessions.set(session.code, session);
      res.status(201).json({ session, member });
    }),
  );

  app.post(
    "/api/sessions/:code/join",
    handle((req, res) => {
      const session = getOr404(req.params.code);
      const member = logic.joinSession(session, String(req.body?.name ?? ""));
      broadcast(session.code);
      res.status(201).json({ session, member });
    }),
  );

  app.get(
    "/api/sessions/:code",
    handle((req, res) => {
      res.json(getOr404(req.params.code));
    }),
  );

  app.post(
    "/api/sessions/:code/start",
    handle((req, res) => {
      const session = getOr404(req.params.code);
      logic.startSwiping(session, req.body?.recipeIds);
      broadcast(session.code);
      res.json(session);
    }),
  );

  app.post(
    "/api/sessions/:code/swipe",
    handle((req, res) => {
      const session = getOr404(req.params.code);
      const { memberId, recipeId, liked } = req.body ?? {};
      logic.submitSwipe(session, String(memberId), String(recipeId), Boolean(liked));
      broadcast(session.code);
      res.json(session);
    }),
  );

  app.post(
    "/api/sessions/:code/again",
    handle((req, res) => {
      const session = getOr404(req.params.code);
      logic.playAgain(session);
      broadcast(session.code);
      res.json(session);
    }),
  );

  // Live updates: subscribe to one session's stream.
  app.get("/api/sessions/:code/events", (req, res) => {
    const code = req.params.code.toUpperCase();
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send the current snapshot immediately so a fresh subscriber is in sync.
    const current = sessions.get(code);
    if (current) res.write(`data: ${JSON.stringify(current)}\n\n`);

    const set = subscribers.get(code) ?? new Set<Response>();
    set.add(res);
    subscribers.set(code, set);

    // Comment pings keep proxies from closing an idle connection.
    const keepAlive = setInterval(() => res.write(": ping\n\n"), 25_000);

    req.on("close", () => {
      clearInterval(keepAlive);
      set.delete(res);
      if (set.size === 0) subscribers.delete(code);
    });
  });

  return app;
}

// Start listening unless we're being imported by a test.
if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 8787);
  createServer().listen(port, () => {
    console.log(`DinnerMatch API listening on http://localhost:${port}`);
  });
}
