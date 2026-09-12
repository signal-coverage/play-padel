import { NextResponse, type NextRequest } from "next/server";
import { listReservationsByUser } from "@/core/reservations/services/reservations.service";
import { requireAuthUser } from "@/lib/auth/requireAuthUser";

// Same cadence as app/api/notifications/stream/route.ts — see that file's own
// comments for why plain server-side polling (not Postgres LISTEN/NOTIFY) was
// chosen, and why MAX_CONNECTION_MS is a deliberate periodic handoff rather
// than a dropped connection.
export const POLL_INTERVAL_MS = 2_000;
export const HEARTBEAT_INTERVAL_MS = 15_000;
export const MAX_CONNECTION_MS = 270_000;

/**
 * Real-time push for ONE reservation a player is actively watching on
 * PaymentReturnView (see hooks.ts's usePaymentReturnStream, the sole
 * consumer) while waiting on Mercado Pago's webhook to settle it. This never
 * replaces GET /api/player/reservations — the existing REST route stays the
 * single source of truth for the reservation's shape; this stream only tells
 * the client WHEN to refetch it, the instant something changes, instead of
 * waiting out usePaymentReturnStatus's own 3s poll.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuthUser();
  if (!authResult.ok) return authResult.response;
  const { userId } = authResult;

  const reservationId = request.nextUrl.searchParams.get("reservationId");
  if (!reservationId) {
    return NextResponse.json(
      { error: "reservationId is required" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      // undefined = no baseline polled yet; null = polled, but this
      // reservation isn't in the list (shouldn't normally happen — the
      // client only opens this once it already has a reservationId — but
      // treated the same as any other snapshot rather than as an error).
      let lastKey: string | null | undefined = undefined;

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
        let reservations: Awaited<ReturnType<typeof listReservationsByUser>>;
        try {
          reservations = await listReservationsByUser(userId, {
            includePast: true,
          });
        } catch (err) {
          console.error("[reservations/stream] poll failed:", err);
          return;
        }
        if (closed) return;

        const reservation =
          reservations.find((r) => r.id === reservationId) ?? null;
        const key = reservation
          ? `${reservation.status}:${reservation.paymentExpiresAt?.toISOString() ?? ""}`
          : null;

        if (lastKey === undefined) {
          lastKey = key;
          return;
        }
        if (key === lastKey) return;
        lastKey = key;

        controller.enqueue(
          encoder.encode(
            `event: changed\ndata: ${JSON.stringify({ status: reservation?.status ?? null })}\n\n`,
          ),
        );
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
