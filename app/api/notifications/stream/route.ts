import { listRecipientNotifications } from "@/core/notifications/services/notifications.service";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";
import type { Notification } from "@/core/notifications/types";

// How often this route re-checks the DB for anything new, per connected
// client. There's no Postgres LISTEN/NOTIFY (or similar pub/sub) wired up
// behind this — that would need a dedicated long-lived DB connection per
// stream, which risks exhausting Neon's pooled-connection limit as
// concurrent users grow. Polling server-side instead, on a plain
// short-lived query already used elsewhere (listRecipientNotifications),
// keeps this simple and reuses exactly what GET /api/notifications itself
// calls — the client just gets told the instant THIS loop notices
// something new, rather than waiting out its own poll interval.
export const POLL_INTERVAL_MS = 2_000;

// Idle SSE connections can get killed by an intermediary proxy/load
// balancer that assumes silence means "dead" — a periodic comment line
// (a leading `:`, valid SSE, ignored by EventSource's own message
// parsing) keeps bytes flowing without being a real event.
export const HEARTBEAT_INTERVAL_MS = 15_000;

// Comfortably under Vercel's default 300s function duration. Once this
// fires, the server closes the stream on purpose — native EventSource
// reconnects automatically on any connection close (unless told not to),
// so this is a deliberate periodic handoff to a fresh function invocation,
// not a dropped connection the client has to work around.
export const MAX_CONNECTION_MS = 270_000;

/**
 * Real-time (well, ~2s-polled server-side, pushed instantly to the client
 * the moment this loop notices it) notification delivery — see
 * NotificationsBell/hooks.ts's useNotificationStream, the sole consumer.
 * GET /api/notifications (the REST list) is untouched and still does its
 * own independent 30s poll as a fallback/baseline; this stream's only job
 * is to tell the client "something new just happened" as soon as
 * possible so it can toast about it and invalidate that REST query,
 * rather than waiting out its own interval.
 */
export async function GET(request: Request) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      // null (not an empty Set) is the "haven't established a baseline
      // yet" state, same convention as the client's own
      // useNotifications — distinguishes "first poll ever, nothing is
      // actually new" from "a later poll landed with zero rows".
      let seenIds: Set<string> | null = null;

      function close() {
        if (closed) return;
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        clearTimeout(endTimer);
        try {
          controller.close();
        } catch {
          // Already closed (e.g. the client disconnected right as this
          // ran) — nothing left to do.
        }
      }

      async function poll() {
        if (closed) return;
        let notifications: Notification[];
        try {
          notifications = await listRecipientNotifications(userId);
        } catch (err) {
          console.error("[notifications/stream] poll failed:", err);
          return;
        }
        if (closed) return;

        if (seenIds === null) {
          seenIds = new Set(notifications.map((n) => n.id));
          return;
        }

        const previouslySeen = seenIds;
        const newOnes = notifications.filter((n) => !previouslySeen.has(n.id));
        seenIds = new Set(notifications.map((n) => n.id));
        for (const notification of newOnes) {
          controller.enqueue(
            encoder.encode(
              `event: notification\ndata: ${JSON.stringify(notification)}\n\n`,
            ),
          );
        }
      }

      function heartbeat() {
        if (closed) return;
        controller.enqueue(encoder.encode(": ping\n\n"));
      }

      void poll();
      const pollTimer = setInterval(() => void poll(), POLL_INTERVAL_MS);
      const heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
      const endTimer = setTimeout(close, MAX_CONNECTION_MS);

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disables response buffering on nginx-fronted deployments so
      // events reach the client as they're enqueued, not batched.
      "X-Accel-Buffering": "no",
    },
  });
}
