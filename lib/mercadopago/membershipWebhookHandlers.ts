import { NextResponse } from "next/server";
import {
  getMembershipPreapproval,
  type MembershipPreapprovalDetail,
} from "@/lib/mercadopago/membershipPreapprovals";
import {
  findMembershipSubscriptionByPreapprovalId,
  recordSuccessfulCharge,
  recordFailedCharge,
  recordAutoCancellation,
  InvalidMembershipTransitionError,
} from "@/core/billing/services/membership.service";

function isIdempotentTransitionError(err: unknown): boolean {
  return (
    err instanceof InvalidMembershipTransitionError ||
    (err instanceof Error && err.name === "InvalidMembershipTransitionError")
  );
}

export type MembershipWebhookDecision =
  | { action: "successful_charge" }
  | { action: "failed_charge" }
  | { action: "auto_cancellation" }
  | { action: "noop"; reason: string };

/**
 * Pure decision function: interprets a freshly re-fetched preapproval (see
 * `getMembershipPreapproval`) and decides which
 * `core/billing/services/membership.service.ts` transition, if any,
 * applies. `status` alone stays `"authorized"` throughout MP's own
 * dunning/recycling retries (see design.md's "Grace period source of
 * truth" decision) — a non-zero `pendingChargeQuantity` or a
 * yellow/red `semaphore` is what actually signals a failed/recycling
 * charge rather than a routine successful one.
 */
export function resolveMembershipWebhookDecision(
  preapproval: Pick<MembershipPreapprovalDetail, "status" | "summarized">,
): MembershipWebhookDecision {
  if (preapproval.status === "canceled") {
    return { action: "auto_cancellation" };
  }

  if (preapproval.status === "authorized") {
    const summarized = preapproval.summarized;
    const hasPendingCharge = (summarized?.pendingChargeQuantity ?? 0) > 0;
    const unhealthySemaphore =
      summarized?.semaphore === "yellow" || summarized?.semaphore === "red";

    if (hasPendingCharge || unhealthySemaphore) {
      return { action: "failed_charge" };
    }
    return { action: "successful_charge" };
  }

  // "paused" (expected between cycles for MANUAL-renewal clubs — see
  // membershipPreapprovals.ts's pause/reactivate helpers) or "pending" (not
  // yet authorized, should not normally reach here once a club has an
  // authorized preapproval on file) — neither requires an independent
  // membership-status transition.
  return {
    action: "noop",
    reason: `preapproval status "${preapproval.status}" requires no membership transition`,
  };
}

/**
 * Handles the `subscription_preapproval` topic — the ONLY membership webhook
 * topic now that both cycles bill through a Mercado Pago preapproval
 * (MONTHLY every 1 month, ANNUAL every 12).
 *
 * Extracted out of a dedicated route so it can be called directly from the
 * ONE Mercado Pago webhook URL this app actually has registered
 * (`app/api/webhooks/mercadopago/route.ts`) — Mercado Pago's DevPanel
 * registers exactly one notification URL per environment (test/production),
 * not one per subscribed topic, so a separate physical route for this topic
 * would never actually be called in a real deployment. See
 * `app/api/webhooks/mercadopago/route.ts`'s file-level comment for the full
 * consolidation rationale.
 */
export async function handleSubscriptionPreapprovalTopic(
  dataId: string | null,
  notificationId: string | null,
): Promise<NextResponse> {
  if (!dataId) {
    return NextResponse.json({ ok: true });
  }

  const subscription = await findMembershipSubscriptionByPreapprovalId(dataId);
  if (!subscription) {
    // No club records this preapproval id — nothing to act on. Ack rather
    // than error, matching the reservation webhook's convention for a
    // notification about an entity this app doesn't recognize.
    return NextResponse.json({ ok: true });
  }

  let preapproval: MembershipPreapprovalDetail;
  try {
    preapproval = await getMembershipPreapproval(dataId);
  } catch (err) {
    console.error(
      `[membership webhook] Failed to fetch preapproval ${dataId} for club ${subscription.clubId}:`,
      err,
    );
    return NextResponse.json(
      { error: "Failed to fetch preapproval" },
      { status: 500 },
    );
  }

  const decision = resolveMembershipWebhookDecision(preapproval);
  const now = new Date();

  try {
    switch (decision.action) {
      case "successful_charge":
        await recordSuccessfulCharge({
          clubId: subscription.clubId,
          chargedAt: now,
          webhookEventId: notificationId,
        });
        break;
      case "failed_charge":
        await recordFailedCharge({
          clubId: subscription.clubId,
          failedAt: now,
          webhookEventId: notificationId,
        });
        break;
      case "auto_cancellation":
        await recordAutoCancellation({
          clubId: subscription.clubId,
          cancelledAt: now,
          webhookEventId: notificationId,
        });
        break;
      case "noop":
        break;
    }
  } catch (err) {
    // A duplicate/out-of-order webhook delivery attempting a transition
    // that's already applied (or no longer valid, e.g. a stale "authorized"
    // notification arriving after cancellation already landed) is expected
    // and safe to ack — mirrors membership.service.ts's own
    // webhookEventId-based idempotency and the reservation webhook's
    // tolerance for a duplicate delivery it already processed. Any other
    // error is a genuine failure and must not be swallowed, so Mercado
    // Pago retries the delivery.
    if (!isIdempotentTransitionError(err)) {
      console.error(
        `[membership webhook] Failed to apply "${decision.action}" for club ${subscription.clubId}:`,
        err,
      );
      return NextResponse.json(
        { error: "Failed to process membership webhook" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
