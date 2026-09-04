import { NextResponse, type NextRequest } from "next/server";
import { requireOwnerClub } from "../_lib/require-owner";
import { prisma } from "@/infrastructure/db/client";
import {
  createMembershipCheckoutSchema,
  changeTrialPlanSchema,
} from "@/core/billing/schemas/membershipCheckout.schema";
import { PLAN_DETAILS } from "@/lib/consts/planPricing";
import {
  getMembershipSubscription,
  seedPendingMembershipSubscriptionFromClub,
  attachPendingPreapproval,
  attachPendingPreference,
  startTrial,
  changeTrialPlan,
  saveMembershipPayerIdentification,
} from "@/core/billing/services/membership.service";
import {
  getOrCreateMembershipPreapprovalPlanId,
  resolveFreeTrialConfig,
} from "@/lib/mercadopago/preapprovalPlans";
import {
  createMembershipPreapproval,
  updateMembershipPreapprovalAmount,
} from "@/lib/mercadopago/membershipPreapprovals";
import { createMembershipPreference } from "@/lib/mercadopago/platformPreferences";

function requireAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return appUrl;
}

// Reads the caller's own club's current membership subscription — what the
// dashboard's `PaymentActivationScreen` (Phase 7) polls/reads to decide
// between showing "Pay Membership" vs. a confirmed-state label (see spec's
// "UI Label Reflects Confirmed Payment State").
//
// Post-archive fix (live smoke test): onboarding (Phase 6.2) normally seeds
// a PENDING row for every club up front, but any club that predates that
// seeding step has zero rows in `club_membership_subscriptions` — this used
// to 404 here, leaving the dashboard with no plan-selection UI at all. `GET`
// now lazily seeds the same PENDING row `POST`'s own fallback already
// creates (see `seedPendingMembershipSubscriptionFromClub`), deriving both
// `plan` and `currency` from `Club` since there's no request body to read
// them from here.
export async function GET() {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const clubId = authResult.context.clubId;
  const subscription =
    (await getMembershipSubscription(clubId)) ??
    (await seedPendingMembershipSubscriptionFromClub({ clubId }));

  return NextResponse.json({ subscription });
}

// Initiates a membership payment for the caller's own club — creates the
// real Mercado Pago object (a MONTHLY preapproval, or an ANNUAL one-time
// Checkout Pro preference) and records its id on the subscription row,
// WITHOUT advancing membership status: per spec's "Webhook-Only State
// Confirmation", only the membership webhook handling (dispatched from
// app/api/webhooks/mercadopago/route.ts, see the NOTE below) may move a
// subscription into ACTIVE. A tier with a configured free trial is the
// synchronous exception for BOTH cycles — `startTrial` records TRIALING
// right here, since spec's "Trial start" scenario confirms the trial the
// moment authorization succeeds (MONTHLY: MP's own preapproval
// authorization) or, for ANNUAL (no native MP "authorize without charge"
// primitive for a one-off Checkout Pro preference), the moment this app
// itself starts the app-tracked trial clock — see design.md's "Trial start
// (ANNUAL)" workaround.
//
// NOTE: the membership webhook itself is dispatched from the single,
// consolidated `app/api/webhooks/mercadopago/route.ts` (not a dedicated
// `/membership` path) — Mercado Pago's DevPanel only ever calls ONE
// notification URL per environment, so this repo has no separate reachable
// membership webhook route; see that file and
// `lib/mercadopago/membershipWebhookHandlers.ts`.
//
// "Pay now" during an ANNUAL trial (sdd-verify follow-up fix): calling this
// route again while a club is already TRIALING on the ANNUAL cycle (same
// cycle requested) is also allowed — it's the ONLY way an ANNUAL trial can
// ever generate the one-time payment link and reach ACTIVE, since it starts
// with no Mercado Pago object at all. See the ANNUAL branch below.
export async function POST(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => null);
  const parsed = createMembershipCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const {
    plan,
    cycle,
    renewalMode,
    payerEmail,
    cardTokenId,
    identification,
    saveIdentification,
  } = parsed.data;
  const clubId = authResult.context.clubId;
  const planDetails = PLAN_DETAILS[plan];

  // MAX has no fixed price for either cycle — it's the contact-us/custom
  // tier, explicitly out of scope for automated payment (see spec's
  // "Explicitly Not Covered by This Spec").
  if (cycle === "MONTHLY" && planDetails.monthlyPrice == null) {
    return NextResponse.json(
      { error: `Plan ${plan} is not available for automated monthly checkout` },
      { status: 400 },
    );
  }
  if (cycle === "ANNUAL" && planDetails.annualPrice == null) {
    return NextResponse.json(
      { error: `Plan ${plan} is not available for automated annual checkout` },
      { status: 400 },
    );
  }

  let existing = await getMembershipSubscription(clubId);
  if (!existing) {
    // Onboarding (Phase 6.2) normally seeds a PENDING row for every club
    // up front, so reaching this branch is an edge case (e.g. a club that
    // predates that seeding step) — same shared fallback `GET` now also
    // uses (see `seedPendingMembershipSubscriptionFromClub`). `plan`/
    // `cycle`/`renewalMode` are already known from the request body here,
    // so only `Club.currency` is resolved from the DB — the same
    // club-selected currency onboarding itself uses, never a hardcoded
    // literal (spec's "Currency Threaded as Explicit Parameter").
    existing = await seedPendingMembershipSubscriptionFromClub({
      clubId,
      plan,
      cycle,
      renewalMode: renewalMode ?? "AUTO",
    });
  }

  if (existing.status !== "PENDING") {
    // The one exception: a club already TRIALING on the ANNUAL cycle,
    // requesting ANNUAL again, is a "pay now" attempt — not a redundant
    // checkout. Any other combination (different cycle, or any other
    // non-PENDING status) is still rejected.
    const isAnnualTrialPayNow =
      existing.status === "TRIALING" &&
      existing.cycle === "ANNUAL" &&
      cycle === "ANNUAL";
    if (!isAnnualTrialPayNow) {
      return NextResponse.json(
        {
          error: `Cannot start a new membership checkout while subscription is ${existing.status}`,
        },
        { status: 409 },
      );
    }
  }

  const currency = existing.currency;

  try {
    if (cycle === "MONTHLY") {
      const backUrl = `${requireAppUrl()}/dashboard`;

      // Reuses one preapproval_plan per (plan tier, currency) pair via
      // MembershipPreapprovalPlanCache instead of creating a fresh one on
      // every single MONTHLY checkout — see
      // lib/mercadopago/preapprovalPlans.ts's
      // getOrCreateMembershipPreapprovalPlanId and this batch's
      // apply-progress notes.
      const preapprovalPlan = await getOrCreateMembershipPreapprovalPlanId({
        plan,
        currency,
        backUrl,
      });

      const preapproval = await createMembershipPreapproval({
        clubId,
        preapprovalPlanId: preapprovalPlan.id,
        payerEmail: payerEmail!,
        cardTokenId: cardTokenId!,
        currency,
        // Must match the amount the plan itself was created with (see
        // getOrCreateMembershipPreapprovalPlanId) — Mercado Pago rejects the
        // preapproval otherwise.
        transactionAmount: planDetails.monthlyPrice!,
        backUrl,
      });

      const trialConfig = await prisma.membershipTrialConfig.findUnique({
        where: { plan },
      });
      const freeTrial = resolveFreeTrialConfig(
        trialConfig?.trialDays,
        planDetails.welcomeFreeMonths,
      );

      let subscription = freeTrial
        ? await startTrial({
            clubId,
            plan,
            cycle,
            renewalMode: renewalMode!,
            currency,
            trialOverrideDays: trialConfig?.trialDays,
            fallbackWelcomeFreeMonths: planDetails.welcomeFreeMonths,
            mpPreapprovalId: preapproval.id,
          })
        : await attachPendingPreapproval({
            clubId,
            plan,
            cycle,
            renewalMode: renewalMode!,
            currency,
            mpPreapprovalId: preapproval.id,
          });

      // Only meaningful alongside a real card token, so this only ever runs
      // in the MONTHLY branch — never ANNUAL. Requires BOTH the opt-in flag
      // AND the actual identification the owner confirmed; never persists
      // one without the other (see membershipCheckout.schema.ts).
      if (saveIdentification === true && identification) {
        subscription = await saveMembershipPayerIdentification(
          clubId,
          identification,
        );
      }

      return NextResponse.json({
        subscription,
        mpPreapprovalId: preapproval.id,
      });
    }

    // ANNUAL — one-time Checkout Pro payment, never a recurring MP object
    // (spec's "Annual Billing Uses One-Time Payment"). Unlike MONTHLY, MP
    // has no native "authorize without charge" primitive for a one-off
    // Checkout Pro preference (confirmed: `auto_recurring.free_trial` only
    // exists on `preapproval_plan`) — see design.md's "Trial start
    // (ANNUAL)" workaround: keep an app-tracked `trialEndsAt` gate and defer
    // checkout until the trial ends, instead of the MONTHLY-style "already
    // authorized while trialing" flow. So a trial-eligible ANNUAL checkout
    // records `TRIALING` via `startTrial` (mirroring the MONTHLY branch
    // above) WITHOUT creating any Mercado Pago object — no preference, no
    // checkoutUrl, no payment method authorized upfront.

    // "Pay now" during an ANNUAL trial (sdd-verify follow-up fix): the
    // early PENDING guard above only lets this branch run for an existing
    // TRIALING+ANNUAL subscription when the owner explicitly asks to pay —
    // never to (re-)evaluate trial eligibility. Skip trial resolution
    // entirely and go straight to generating the real one-time payment
    // link; `attachPendingPreference` leaves `status` at TRIALING (never
    // jumps to ACTIVE itself) until the payment webhook confirms it, same
    // "webhook-only state confirmation" rule as every other path. Without
    // this branch, an ANNUAL trial had no way back into this route to ever
    // generate a payment link — it was doomed to expire via the cron sweep.
    if (existing.status === "TRIALING") {
      const preference = await createMembershipPreference({
        clubId,
        plan,
        price: planDetails.annualPrice!,
        currency,
      });

      const subscription = await attachPendingPreference({
        clubId,
        plan,
        currency,
        mpPreferenceId: preference.preferenceId,
      });

      return NextResponse.json({
        subscription,
        checkoutUrl: preference.checkoutUrl,
      });
    }

    const trialConfig = await prisma.membershipTrialConfig.findUnique({
      where: { plan },
    });
    const freeTrial = resolveFreeTrialConfig(
      trialConfig?.trialDays,
      planDetails.welcomeFreeMonths,
    );

    if (freeTrial) {
      const subscription = await startTrial({
        clubId,
        plan,
        cycle,
        renewalMode: renewalMode ?? "AUTO",
        currency,
        trialOverrideDays: trialConfig?.trialDays,
        fallbackWelcomeFreeMonths: planDetails.welcomeFreeMonths,
      });

      return NextResponse.json({ subscription });
    }

    const preference = await createMembershipPreference({
      clubId,
      plan,
      price: planDetails.annualPrice!,
      currency,
    });

    const subscription = await attachPendingPreference({
      clubId,
      plan,
      currency,
      mpPreferenceId: preference.preferenceId,
    });

    return NextResponse.json({
      subscription,
      checkoutUrl: preference.checkoutUrl,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to start membership checkout";
    console.error(
      `[clubs/membership] Failed to start ${cycle} checkout for club ${clubId}:`,
      err,
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Changes the caller's own club's plan tier IMMEDIATELY, valid ONLY while
// the membership subscription is TRIALING — every plan tier currently has a
// free trial, and while trialing no real charge has happened yet on EITHER
// cycle (MONTHLY: an authorized-but-uncharged preapproval; ANNUAL: no
// Mercado Pago object at all), so whatever the owner picks here simply
// becomes what eventually gets charged. Deliberately separate from
// `requestPlanChange` (core/billing/services/membership.service.ts), which
// only applies once ACTIVE and defers to the next renewal boundary with no
// proration — that mechanism is untouched by this route. Scope is plan tier
// only, same billing cycle — cycle switching (MONTHLY<->ANNUAL) is not
// covered here.
export async function PATCH(request: NextRequest) {
  const authResult = await requireOwnerClub();
  if (!authResult.ok) return authResult.response;

  const body = await request.json().catch(() => null);
  const parsed = changeTrialPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const clubId = authResult.context.clubId;
  const existing = await getMembershipSubscription(clubId);
  if (!existing) {
    return NextResponse.json(
      { error: "No membership subscription found" },
      { status: 404 },
    );
  }

  if (existing.status !== "TRIALING") {
    return NextResponse.json(
      { error: "Plan can only be changed immediately while on a free trial" },
      { status: 409 },
    );
  }

  const { plan } = parsed.data;
  const planDetails = PLAN_DETAILS[plan];
  const price =
    existing.cycle === "MONTHLY"
      ? planDetails.monthlyPrice
      : planDetails.annualPrice;

  if (price == null) {
    return NextResponse.json(
      {
        error: `Plan ${plan} is not available for automated ${existing.cycle === "MONTHLY" ? "monthly" : "annual"} checkout`,
      },
      { status: 400 },
    );
  }

  try {
    // MONTHLY already has an authorized preapproval on file — its own
    // charge amount must be kept in sync via MP's own PUT support for
    // updating an existing subscription's amount (see
    // updateMembershipPreapprovalAmount's doc comment). ANNUAL trials never
    // create a Mercado Pago object at all (see `startTrial`'s ANNUAL
    // caller above), so there is nothing to update there.
    if (existing.cycle === "MONTHLY" && existing.mpPreapprovalId) {
      await updateMembershipPreapprovalAmount(
        existing.mpPreapprovalId,
        price,
        existing.currency,
      );
    }

    const subscription = await changeTrialPlan({ clubId, newPlan: plan });

    return NextResponse.json({ subscription });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to change plan";
    console.error(
      `[clubs/membership] Failed to change trial plan for club ${clubId}:`,
      err,
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
