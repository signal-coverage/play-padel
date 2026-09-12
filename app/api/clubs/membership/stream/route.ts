import { getMembershipSubscription } from "@/core/billing/services/membership.service";
import { requireOwnerClub } from "../../_lib/require-owner";

// Same cadence as app/api/notifications/stream/route.ts — see that file's own
// comments for why plain server-side polling (not Postgres LISTEN/NOTIFY) was
// chosen, and why MAX_CONNECTION_MS is a deliberate periodic handoff rather
// than a dropped connection.
export const POLL_INTERVAL_MS = 2_000;
export const HEARTBEAT_INTERVAL_MS = 15_000;
export const MAX_CONNECTION_MS = 270_000;

/**
 * Real-time push for the caller's own club's membership subscription status
 * (see PlanSelectionModal/hooks.ts's useMembershipSubscriptionStream) while
 * an owner is waiting on Mercado Pago's webhook to settle a checkout
 * (PENDING/TRIALING -> ACTIVE, or the ANNUAL hosted-checkout tab). GET
 * /api/clubs/membership stays the single source of truth for the
 * subscription's full shape; this stream only tells the client WHEN to
 * refetch it, instead of waiting out useMembershipSubscription's own
 * AWAITING_CONFIRMATION_POLL_INTERVAL_MS poll.
 */
export async function GET(request: Request) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;
  const { clubId } = authResult.context;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      // undefined = no baseline polled yet.
      let lastStatus: string | null | undefined = undefined;

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
        let subscription: Awaited<ReturnType<typeof getMembershipSubscription>>;
        try {
          subscription = await getMembershipSubscription(clubId);
        } catch (err) {
          console.error("[clubs/membership/stream] poll failed:", err);
          return;
        }
        if (closed) return;

        const status = subscription?.status ?? null;

        if (lastStatus === undefined) {
          lastStatus = status;
          return;
        }
        if (status === lastStatus) return;
        lastStatus = status;

        controller.enqueue(
          encoder.encode(
            `event: changed\ndata: ${JSON.stringify({ status })}\n\n`,
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
