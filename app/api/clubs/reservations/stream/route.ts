import { NextResponse, type NextRequest } from "next/server";
import { listReservationsByClub } from "@/core/reservations/services/reservations.service";
import { requireOwnerClub } from "../../_lib/require-owner";
import { parseDateParam } from "../../_lib/parse-date-param";

// Same cadence as app/api/notifications/stream/route.ts — see that file's own
// comments for why plain server-side polling (not Postgres LISTEN/NOTIFY) was
// chosen, and why MAX_CONNECTION_MS is a deliberate periodic handoff rather
// than a dropped connection.
//
// Broadcast caveat (unlike every other stream this app has — those are all
// private, one connection per signed-in user): more than one staff member of
// the SAME club can have this day's reservations table open at once, and
// each open tab runs its OWN independent poll loop against the DB at this
// same cadence. For a single club's realistic staff headcount this is a
// non-issue; it would need a real per-(clubId, date) fan-out (one shared
// poller broadcasting to every subscribed connection) before this pattern
// could scale to, say, hundreds of concurrent viewers of the same day.
export const POLL_INTERVAL_MS = 2_000;
export const HEARTBEAT_INTERVAL_MS = 15_000;
export const MAX_CONNECTION_MS = 270_000;

function fingerprint(
  reservations: Array<{ id: string; status: string; updatedAt: Date }>,
): string {
  return reservations
    .map((r) => `${r.id}:${r.status}:${r.updatedAt.toISOString()}`)
    .sort()
    .join(",");
}

/**
 * Real-time push for the caller's own club's reservations on ONE day (see
 * ReservationsView/hooks.ts's useReservationsStream). GET /api/clubs/
 * reservations and GET /api/clubs/courts/[courtId]/slots stay the single
 * sources of truth for their own shapes; this stream carries no payload at
 * all — it only tells the client WHEN to refetch BOTH (mirroring
 * useReservationAction's own onSuccess, which already invalidates both the
 * "reservations" and "court-slots" query families together as two views of
 * the same underlying data), instead of waiting out their shared 15s poll.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;
  const { clubId } = authResult.context;

  const parsedDate = parseDateParam(request.nextUrl.searchParams.get("date"));
  if (!parsedDate) {
    return NextResponse.json(
      { error: "Invalid or missing date query param (expected YYYY-MM-DD)" },
      { status: 400 },
    );
  }
  // Re-bound to a fresh const so TS's narrowing survives into the nested
  // `poll` closure below — narrowing a captured outer variable doesn't
  // persist across a function boundary on its own.
  const date: Date = parsedDate;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      // undefined = no baseline polled yet.
      let lastFingerprint: string | undefined = undefined;

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
        let reservations: Awaited<ReturnType<typeof listReservationsByClub>>;
        try {
          reservations = await listReservationsByClub(clubId, { date });
        } catch (err) {
          console.error("[clubs/reservations/stream] poll failed:", err);
          return;
        }
        if (closed) return;

        const current = fingerprint(reservations);

        if (lastFingerprint === undefined) {
          lastFingerprint = current;
          return;
        }
        if (current === lastFingerprint) return;
        lastFingerprint = current;

        controller.enqueue(encoder.encode("event: changed\ndata: {}\n\n"));
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
      "X-Accel-Buffering": "no",
    },
  });
}
