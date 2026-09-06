import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { getMembershipPreapproval } from "@/lib/mercadopago/membershipPreapprovals";
import {
  recordAutoCancellation,
  recordSuccessfulCharge,
  recordManualPeriodExpiredWithoutRenewal,
  recordManualLockout,
} from "@/core/billing/services/membership.service";
import { logSystemJob } from "@/core/systemJobs/services/systemJobs.service";

// AUTO mode fully relies on Mercado Pago's own recycling/dunning timeline
// (~10 days, up to 4 retries) as its grace period — no independent app-side
// clock (see design.md's "Grace period source of truth" decision). This
// window is therefore a BACKSTOP ONLY, deliberately wider than MP's own
// timeline so it never races a webhook that is simply still in flight; it
// only reconciles subscriptions where a webhook was very likely missed
// (MP's own timeline should already have resolved the subscription one way
// or another by this point).
export const AUTO_BACKSTOP_WINDOW_DAYS = 21;

// MANUAL mode has no MP-side retry signal at all (the preapproval is
// deliberately paused between cycles) — this cron IS the primary,
// authoritative lockout mechanism for this mode, not a backstop. Matches
// the 7-day grace window already exercised by
// `recordManualPeriodExpiredWithoutRenewal`'s own test suite (Phase 3).
export const MANUAL_GRACE_WINDOW_DAYS = 7;

// Triggered by Vercel Cron (see vercel.json). Not a Clerk session —
// proxy.ts allowlists this route and this bearer check is the only auth,
// matching Vercel's documented CRON_SECRET pattern (same convention as
// app/api/cron/notifications/route.ts and
// app/api/cron/mercadopago-token-refresh/route.ts).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Started only after the auth check passes — an unauthorized probe should
  // never pollute the system job history (see core/systemJobs).
  const startedAt = new Date();
  try {
    return await runGraceSweep(startedAt);
  } catch (err) {
    await logSystemJob({
      kind: "CRON",
      name: "membership-grace-sweep",
      status: "FAILURE",
      startedAt,
      finishedAt: new Date(),
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

async function runGraceSweep(startedAt: Date): Promise<NextResponse> {
  const now = new Date();
  const autoBackstopCutoff = new Date(
    now.getTime() - AUTO_BACKSTOP_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  let autoReconciled = 0;
  let autoStillPending = 0;
  let annualTrialsExpired = 0;
  let manualExpired = 0;
  let manualLockedOut = 0;
  let failed = 0;

  // --- AUTO mode: missed-webhook backstop only. Never an independent
  // grace-period clock — MP's own recycling/dunning timeline remains
  // authoritative; this only reconciles subscriptions stuck well past the
  // point that timeline should already have resolved them. ---
  const stuckAutoSubscriptions =
    await prisma.clubMembershipSubscription.findMany({
      where: {
        renewalMode: "AUTO",
        status: "PAST_DUE",
        pastDueSince: { not: null, lte: autoBackstopCutoff },
        mpPreapprovalId: { not: null },
      },
      select: { clubId: true, mpPreapprovalId: true },
    });

  for (const sub of stuckAutoSubscriptions) {
    try {
      const preapproval = await getMembershipPreapproval(sub.mpPreapprovalId!);
      if (preapproval.status === "canceled") {
        await recordAutoCancellation({ clubId: sub.clubId, cancelledAt: now });
        autoReconciled++;
      } else if (preapproval.status === "authorized") {
        await recordSuccessfulCharge({ clubId: sub.clubId, chargedAt: now });
        autoReconciled++;
      } else {
        // Still in some other MP-side state we don't recognize as resolved
        // (e.g. still recycling) — MP's own timeline is still authoritative,
        // don't guess.
        autoStillPending++;
      }
    } catch {
      failed++;
    }
  }

  // --- ANNUAL trial expiry: no native MP trial-without-charge exists for a
  // one-time Checkout Pro payment, so `trialEndsAt` is app-tracked and
  // authoritative for ANNUAL only (see design.md's ANNUAL-trial correction).
  // If the trial ends with no confirmed payment webhook, the subscription
  // is cancelled — reusing `recordAutoCancellation`'s CANCELLED +
  // `Club.status` sync rather than duplicating that logic, even though this
  // path is cron-driven, not MP-webhook-driven (no `webhookEventId`).
  //
  // `mpPreferenceId: null` excludes rows with a payment attempt already in
  // flight (sdd-verify follow-up fix): a "Pay Now" checkout during the trial
  // sets `mpPreferenceId` but deliberately leaves `status` at TRIALING until
  // the webhook confirms it (webhook-only state confirmation). Without this
  // exclusion, a trial ending right as (or after) that pay-now click — with
  // the webhook simply not yet landed before this once-daily cron runs —
  // would be wrongly cancelled despite an already-in-flight/possibly-already
  // -successful payment. A row excluded here either gets confirmed ACTIVE by
  // the webhook shortly after, or a permanently failed/never-completed
  // payment is a separate concern already covered by the existing
  // payment-webhook/rejected-payment handling — not this sweep's job.
  const expiredAnnualTrials = await prisma.clubMembershipSubscription.findMany({
    where: {
      cycle: "ANNUAL",
      status: "TRIALING",
      trialEndsAt: { not: null, lte: now },
      mpPreferenceId: null,
    },
    select: { clubId: true },
  });

  for (const sub of expiredAnnualTrials) {
    try {
      await recordAutoCancellation({ clubId: sub.clubId, cancelledAt: now });
      annualTrialsExpired++;
    } catch {
      failed++;
    }
  }

  // --- MANUAL mode: this cron is the sole/authoritative lockout mechanism
  // (no MP-side backstop exists for a deliberately-paused subscription). ---
  const expiredManualPeriods = await prisma.clubMembershipSubscription.findMany(
    {
      where: {
        renewalMode: "MANUAL",
        status: "ACTIVE",
        currentPeriodEnd: { not: null, lte: now },
      },
      select: { clubId: true },
    },
  );

  for (const sub of expiredManualPeriods) {
    try {
      await recordManualPeriodExpiredWithoutRenewal({
        clubId: sub.clubId,
        now,
        graceWindowDays: MANUAL_GRACE_WINDOW_DAYS,
      });
      manualExpired++;
    } catch {
      failed++;
    }
  }

  const overdueManualLockouts =
    await prisma.clubMembershipSubscription.findMany({
      where: {
        renewalMode: "MANUAL",
        status: "PAST_DUE",
        pastDueUntil: { not: null, lte: now },
      },
      select: { clubId: true },
    });

  for (const sub of overdueManualLockouts) {
    try {
      await recordManualLockout({ clubId: sub.clubId, now });
      manualLockedOut++;
    } catch {
      failed++;
    }
  }

  await logSystemJob({
    kind: "CRON",
    name: "membership-grace-sweep",
    status: "SUCCESS",
    startedAt,
    finishedAt: new Date(),
  });

  return NextResponse.json({
    autoReconciled,
    autoStillPending,
    annualTrialsExpired,
    manualExpired,
    manualLockedOut,
    failed,
  });
}
