import { listReservationsByClub } from "@/core/reservations/services/reservations.service";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";

// Same cadence as app/api/notifications/stream/route.ts — see that file's own
// comments for why plain server-side polling (not Postgres LISTEN/NOTIFY) was
// chosen, and why MAX_CONNECTION_MS is a deliberate periodic handoff rather
// than a dropped connection.
//
// Broadcast caveat (unlike every other stream this app has — those are all
// private, one connection per signed-in user): every player currently
// looking at this same club/date runs their OWN independent poll loop
// against the DB at this cadence, same tradeoff noted on
// app/api/clubs/reservations/stream/route.ts. Acceptable at this app's
// scale; a real per-(clubId, date) fan-out would be needed to scale past
// that.
export const POLL_INTERVAL_MS = 2_000;
export const HEARTBEAT_INTERVAL_MS = 15_000;
export const MAX_CONNECTION_MS = 270_000;

// "YYYY-MM-DD" -> local-midnight Date, matching the REST availability
// route's own parseLocalDate (../route.ts) — duplicated rather than
// exported/imported across files per this repo's SRP-per-folder convention.
function parseLocalDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function fingerprint(
  reservations: Array<{ id: string; status: string; updatedAt: Date }>,
): string {
  return reservations
    .map((r) => `${r.id}:${r.status}:${r.updatedAt.toISOString()}`)
    .sort()
    .join(",");
}

/**
 * Real-time push for one club's court availability on ONE day (see
 * BrowseCourts/hooks.ts's useClubAvailabilityStream) — the instant another
 * player books or cancels a slot, everyone else looking at this same grid
 * gets told to refetch it, instead of waiting out the shared 15s poll. GET
 * /api/player/clubs/[clubId]/availability stays the single source of truth
 * for the grid's actual shape; this stream carries no payload, only a
 * "something changed" signal — reusing listReservationsByClub's own default
 * ACTIVE_RESERVATION_STATUSES filter (exactly the rows that can block a
 * slot) rather than recomputing the full composed grid (courts + slots +
 * waitlist flags) on every poll tick, which would be far more expensive for
 * data this stream never actually needs to serve itself.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> },
) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;

  const { clubId } = await params;
  const url = new URL(request.url);
  const parsedDate = parseLocalDate(url.searchParams.get("date"));
  if (!parsedDate) {
    return Response.json(
      { error: "Missing or invalid date (expected YYYY-MM-DD)" },
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
          console.error("[player/clubs/availability/stream] poll failed:", err);
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
