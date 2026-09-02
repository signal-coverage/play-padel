import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Phase 9 — end-to-end integration verification.
//
// Every OTHER test in this change mocks the layer directly below the module
// under test (e.g. the webhook route test mocks `membership.service.ts`
// itself; the `clubs/membership` route test mocks the `lib/mercadopago/*`
// wrapper modules). That's correct for fast, focused unit coverage, but it
// means no single test exercises the REAL multi-module chain a club actually
// walks through: onboarding's seeded PENDING row -> the owner's checkout
// request -> a real Mercado Pago object id being persisted -> a webhook
// re-confirming that object's state -> the state machine's real transition
// logic -> the MP-connect gate reading that same real state.
//
// This file closes that gap. It mocks ONLY the true external boundaries:
//   - `@/infrastructure/db/client` (Prisma) — replaced with a tiny in-memory
//     store, so every route/service function under test still runs its own
//     real query shape against something that behaves like a database.
//   - `mercadopago` (the SDK) — replaced with per-call mocks, so no real
//     HTTP call is ever made, but every `lib/mercadopago/*` wrapper module
//     (platformClient, membershipPreapprovals, preapprovalPlans,
//     platformPreferences) runs its REAL body-building/response-mapping code.
//   - `@clerk/nextjs/server` — replaced with a fixed authenticated user, so
//     even `requireOwnerClub` (app/api/clubs/_lib/require-owner.ts) runs for
//     real against the in-memory `userProfile` table.
// `core/billing/services/membership.service.ts` itself is NEVER mocked here.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const {
  subscriptions,
  clubs,
  userProfiles,
  trialConfigs,
  preapprovalPlanCache,
} = vi.hoisted(() => {
  return {
    subscriptions: new Map<string, Row>(),
    clubs: new Map<string, Row>(),
    userProfiles: new Map<string, Row>(),
    trialConfigs: new Map<string, Row>(),
    preapprovalPlanCache: new Map<string, Row>(),
  };
});

function matchesWhere(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, cond]) => {
    const value = row[key];
    if (cond !== null && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as Record<string, unknown>;
      if ("not" in c && c.not === null && value === null) return false;
      if ("lte" in c) {
        const lte = c.lte as Date;
        if (!(value instanceof Date) || value.getTime() > lte.getTime()) {
          return false;
        }
      }
      return true;
    }
    return value === cond;
  });
}

let subIdCounter = 0;

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubMembershipSubscription: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        subIdCounter += 1;
        const now = new Date();
        const row: Row = {
          id: `sub_${subIdCounter}`,
          pendingPlan: null,
          cycle: "MONTHLY",
          pendingCycle: null,
          renewalMode: "AUTO",
          mpPreapprovalId: null,
          mpPreferenceId: null,
          mpCustomerId: null,
          mpCardId: null,
          trialEndsAt: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          pastDueSince: null,
          pastDueUntil: null,
          lastWebhookEventId: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        subscriptions.set(row.clubId as string, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: { where: { clubId: string } }) => {
        return subscriptions.get(where.clubId) ?? null;
      }),
      findFirst: vi.fn(async ({ where }: { where: Row }) => {
        const found = [...subscriptions.values()].find((row) =>
          matchesWhere(row, where),
        );
        return found ? { clubId: found.clubId } : null;
      }),
      findMany: vi.fn(async ({ where }: { where: Row }) => {
        return [...subscriptions.values()]
          .filter((row) => matchesWhere(row, where))
          .map((row) => ({
            clubId: row.clubId,
            mpPreapprovalId: row.mpPreapprovalId,
          }));
      }),
      update: vi.fn(
        async ({ where, data }: { where: { clubId: string }; data: Row }) => {
          const existing = subscriptions.get(where.clubId);
          if (!existing) {
            throw new Error(`No subscription for club ${where.clubId}`);
          }
          const updated = { ...existing, ...data, updatedAt: new Date() };
          subscriptions.set(where.clubId, updated);
          return updated;
        },
      ),
    },
    club: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return clubs.get(where.id) ?? null;
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Row }) => {
          const existing = clubs.get(where.id) ?? { id: where.id };
          const updated = { ...existing, ...data };
          clubs.set(where.id, updated);
          return updated;
        },
      ),
    },
    userProfile: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        return userProfiles.get(where.id) ?? null;
      }),
    },
    membershipTrialConfig: {
      findUnique: vi.fn(async ({ where }: { where: { plan: string } }) => {
        return trialConfigs.get(where.plan) ?? null;
      }),
    },
    membershipPreapprovalPlanCache: {
      findUnique: vi.fn(
        async ({
          where,
        }: {
          where: { plan_currency: { plan: string; currency: string } };
        }) => {
          const key = `${where.plan_currency.plan}:${where.plan_currency.currency}`;
          return preapprovalPlanCache.get(key) ?? null;
        },
      ),
      create: vi.fn(async ({ data }: { data: Row }) => {
        const key = `${data.plan}:${data.currency}`;
        preapprovalPlanCache.set(key, data);
        return data;
      }),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user_owner_1" })),
}));

const preApprovalPlanCreateMock = vi.fn();
const preApprovalCreateMock = vi.fn();
const preApprovalGetMock = vi.fn();
const preferenceCreateMock = vi.fn();
const paymentGetMock = vi.fn();

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(function (config: unknown) {
    return { config };
  }),
  PreApprovalPlan: vi.fn().mockImplementation(function () {
    return { create: preApprovalPlanCreateMock };
  }),
  PreApproval: vi.fn().mockImplementation(function () {
    return {
      create: preApprovalCreateMock,
      get: preApprovalGetMock,
      update: vi.fn(),
    };
  }),
  Preference: vi.fn().mockImplementation(function () {
    return { create: preferenceCreateMock };
  }),
  Payment: vi.fn().mockImplementation(function () {
    return { get: paymentGetMock };
  }),
}));

vi.mock("@/lib/mercadopago/webhookSignature", () => ({
  verifyMercadoPagoSignature: vi.fn(() => true),
}));

vi.mock("@/lib/mercadopago/oauth", () => ({
  signOAuthState: vi.fn(() => "signed-state"),
  buildMercadoPagoAuthorizationUrl: vi.fn(
    () => "https://auth.mercadopago.com/authorization?client_id=abc",
  ),
}));

import {
  GET as membershipGet,
  POST as membershipPost,
} from "@/app/api/clubs/membership/route";
// Mercado Pago's DevPanel registers exactly ONE notification URL per
// environment, not one per topic — so the real webhook entry point is the
// consolidated base route, not a dedicated `/membership` path (see
// app/api/webhooks/mercadopago/route.ts and
// lib/mercadopago/membershipWebhookHandlers.ts for the full rationale).
import { POST as webhookPost } from "@/app/api/webhooks/mercadopago/route";
import { GET as connectGet } from "@/app/api/clubs/mercadopago/connect/route";
import { GET as cronGet } from "@/app/api/cron/membership-grace-sweep/route";
import { createPendingMembershipSubscription } from "@/core/billing/services/membership.service";

function seedOwner(clubId: string) {
  userProfiles.set("user_owner_1", {
    role: "owner",
    clubId,
  });
  clubs.set(clubId, { id: clubId, currency: "ARS", status: "ACTIVE" });
}

function makeCheckoutRequest(body: unknown) {
  return new NextRequest("http://localhost/api/clubs/membership", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// MP assigns a UNIQUE notification `id` to every webhook delivery, even
// repeated deliveries about the SAME preapproval object (e.g. an
// "authorized" delivery, then a later "recycling" delivery, then a final
// "canceled" delivery for that same preapproval id). `membership.service.ts`
// deliberately treats a REPEATED notification id as an idempotent replay
// no-op (see `recordSuccessfulCharge`/`recordFailedCharge`/
// `recordAutoCancellation`'s shared `lastWebhookEventId` guard) — so this
// helper must mint a fresh notification id per call by default, or a
// multi-webhook scenario for the same preapproval would incorrectly look
// like the same event being replayed and every call after the first would
// silently no-op. Pass `notificationId` explicitly only when a test
// deliberately wants to exercise that replay/idempotency behavior.
let notificationIdCounter = 0;

function makePreapprovalWebhookRequest(
  preapprovalId: string,
  notificationId?: string,
) {
  notificationIdCounter += 1;
  return new NextRequest("http://localhost/api/webhooks/mercadopago", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": "ts=1,v1=abc",
      "x-request-id": "req-1",
    },
    body: JSON.stringify({
      action: "updated",
      data: { id: preapprovalId },
      id: notificationId ?? `notif_${preapprovalId}_${notificationIdCounter}`,
      type: "subscription_preapproval",
    }),
  });
}

function makePaymentWebhookRequest(paymentId: string, clubId: string) {
  const url = new URL("http://localhost/api/webhooks/mercadopago");
  url.searchParams.set("clubId", clubId);
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": "ts=1,v1=abc",
      "x-request-id": "req-1",
    },
    body: JSON.stringify({
      action: "payment.updated",
      data: { id: paymentId },
      id: `notif_${paymentId}`,
      type: "payment",
    }),
  });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "platform-access-token");
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  // This suite's whole purpose is exercising the REAL MP-connect gate
  // against real membership state — opt into gating explicitly (Phase 10's
  // rollout-safety flag defaults OFF/pass-through otherwise, see
  // lib/mercadopago/membershipStatus.ts's `isMembershipGatingEnabled`).
  vi.stubEnv("MEMBERSHIP_GATING_ENABLED", "true");

  subscriptions.clear();
  clubs.clear();
  userProfiles.clear();
  trialConfigs.clear();
  preapprovalPlanCache.clear();
  subIdCounter = 0;
  notificationIdCounter = 0;

  preApprovalPlanCreateMock.mockReset();
  preApprovalCreateMock.mockReset();
  preApprovalGetMock.mockReset();
  preferenceCreateMock.mockReset();
  paymentGetMock.mockReset();
});

describe("End-to-end: AUTO monthly membership (onboarding -> checkout -> webhook -> connect gate)", () => {
  it("walks the full chain from a PENDING onboarding row through trial start, webhook-confirmed charge, and an unlocked MP-connect gate", async () => {
    const clubId = "club_auto_1";
    seedOwner(clubId);

    // Onboarding's real seeding step (Phase 6) — not mocked.
    await createPendingMembershipSubscription({
      clubId,
      plan: "PRO",
      currency: "ARS",
    });

    // Before any checkout: connect must be blocked.
    const blockedConnect = await connectGet();
    expect(blockedConnect.status).toBe(403);

    // Owner opens PlanSelectionModal, picks MONTHLY + AUTO, tokenizes a card.
    preApprovalPlanCreateMock.mockResolvedValue({ id: "plan_auto_1" });
    preApprovalCreateMock.mockResolvedValue({
      id: "preap_auto_1",
      status: "authorized",
    });

    const checkoutResponse = await membershipPost(
      makeCheckoutRequest({
        plan: "PRO",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        payerEmail: "owner@example.com",
        cardTokenId: "card_tok_1",
      }),
    );
    expect(checkoutResponse.status).toBe(200);
    const checkoutBody = await checkoutResponse.json();
    // PRO has a configured `welcomeFreeMonths` fallback, so trial start is
    // the synchronous confirmation here (see route.ts's own comment) — this
    // is the REAL behavior for every automated-monthly tier today, not a
    // simplification for this test.
    expect(checkoutBody.subscription.status).toBe("TRIALING");
    expect(checkoutBody.mpPreapprovalId).toBe("preap_auto_1");

    // A trial requires an authorized preapproval, which already counts as
    // "paid" for gating purposes (spec's "Trial Requires Pre-Authorized MP
    // Preapproval") — connect should already be unlocked, before any webhook.
    const connectDuringTrial = await connectGet();
    expect(connectDuringTrial.status).toBe(307);

    // First real charge after the trial ends — confirmed only via webhook.
    preApprovalGetMock.mockResolvedValue({
      id: "preap_auto_1",
      status: "authorized",
      summarized: {
        charged_quantity: 1,
        pending_charge_quantity: 0,
        last_charged_date: "2026-09-24T12:00:00.000-04:00",
        semaphore: "green",
      },
    });

    const webhookResponse = await webhookPost(
      makePreapprovalWebhookRequest("preap_auto_1"),
    );
    expect(webhookResponse.status).toBe(200);

    const snapshotResponse = await membershipGet();
    const snapshotBody = await snapshotResponse.json();
    expect(snapshotBody.subscription.status).toBe("ACTIVE");
    expect(snapshotBody.subscription.currentPeriodEnd).toBeTruthy();

    // Connect must still be open post-confirmation.
    const connectAfterCharge = await connectGet();
    expect(connectAfterCharge.status).toBe(307);
  });

  it("AUTO renewal failure (MP recycling) flips to PAST_DUE via webhook, then MP's own auto-cancellation locks the club out and closes the connect gate", async () => {
    const clubId = "club_auto_2";
    seedOwner(clubId);
    await createPendingMembershipSubscription({
      clubId,
      plan: "PRO",
      currency: "ARS",
    });

    preApprovalPlanCreateMock.mockResolvedValue({ id: "plan_auto_2" });
    preApprovalCreateMock.mockResolvedValue({
      id: "preap_auto_2",
      status: "authorized",
    });
    await membershipPost(
      makeCheckoutRequest({
        plan: "PRO",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        payerEmail: "owner@example.com",
        cardTokenId: "card_tok_1",
      }),
    );

    // First charge confirms ACTIVE.
    preApprovalGetMock.mockResolvedValue({
      id: "preap_auto_2",
      status: "authorized",
      summarized: null,
    });
    await webhookPost(makePreapprovalWebhookRequest("preap_auto_2"));
    expect((await (await membershipGet()).json()).subscription.status).toBe(
      "ACTIVE",
    );

    // A later renewal starts recycling (MP's own dunning retry).
    preApprovalGetMock.mockResolvedValue({
      id: "preap_auto_2",
      status: "authorized",
      summarized: {
        charged_quantity: 2,
        pending_charge_quantity: 1,
        last_charged_date: "2026-10-24T12:00:00.000-04:00",
        semaphore: "red",
      },
    });
    await webhookPost(makePreapprovalWebhookRequest("preap_auto_2"));
    expect((await (await membershipGet()).json()).subscription.status).toBe(
      "PAST_DUE",
    );
    // Reservation access is not yet revoked (Club.status stays ACTIVE
    // throughout PAST_DUE — see recordFailedCharge, which deliberately never
    // touches Club.status; only recordAutoCancellation/recordManualLockout
    // do, per spec's "no parallel gating mechanism" requirement). The
    // MP-connect gate is a stricter, separate precondition though: per
    // design.md's "MP-connect gate" flow, `requireMembershipPaid` blocks
    // unless status is ACTIVE/TRIALING specifically, so PAST_DUE still
    // blocks new connect attempts (403) even while existing reservation
    // access continues — matches lib/mercadopago/membershipStatus.test.ts's
    // own explicit "is false for PAST_DUE" coverage.
    expect((await connectGet()).status).toBe(403);

    // The cron backstop must NOT act yet — the subscription only just went
    // PAST_DUE, nowhere near the conservative 21-day backstop window.
    const earlySweep = await cronGet(
      new Request("https://app.example.com/api/cron/membership-grace-sweep", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    const earlySweepBody = await earlySweep.json();
    expect(earlySweepBody.autoReconciled).toBe(0);
    expect((await (await membershipGet()).json()).subscription.status).toBe(
      "PAST_DUE",
    );

    // MP itself auto-cancels after 3 consecutive rejections — the
    // cancellation webhook is what actually drives CANCELLED, never the
    // cron's own clock (design.md's resolved grace-period decision).
    preApprovalGetMock.mockResolvedValue({
      id: "preap_auto_2",
      status: "canceled",
      summarized: null,
    });
    await webhookPost(makePreapprovalWebhookRequest("preap_auto_2"));
    expect((await (await membershipGet()).json()).subscription.status).toBe(
      "CANCELLED",
    );
    expect(clubs.get(clubId)?.status).toBe("INACTIVE");
    expect((await connectGet()).status).toBe(403);
  });
});

describe("End-to-end: MANUAL monthly membership — cron-sweep lockout backstop", () => {
  it("locks a MANUAL club out via the cron sweep once its real, checkout-created period lapses with no renewal, then reopens nothing until a brand new subscription exists", async () => {
    const clubId = "club_manual_1";
    seedOwner(clubId);
    await createPendingMembershipSubscription({
      clubId,
      plan: "BASIC",
      currency: "ARS",
    });

    preApprovalPlanCreateMock.mockResolvedValue({ id: "plan_manual_1" });
    preApprovalCreateMock.mockResolvedValue({
      id: "preap_manual_1",
      status: "authorized",
    });
    await membershipPost(
      makeCheckoutRequest({
        plan: "BASIC",
        cycle: "MONTHLY",
        renewalMode: "MANUAL",
        payerEmail: "owner@example.com",
        cardTokenId: "card_tok_1",
      }),
    );

    // First charge confirms ACTIVE with a real currentPeriodEnd, exactly the
    // row a MANUAL club would actually have on file.
    preApprovalGetMock.mockResolvedValue({
      id: "preap_manual_1",
      status: "authorized",
      summarized: null,
    });
    await webhookPost(makePreapprovalWebhookRequest("preap_manual_1"));
    const active = subscriptions.get(clubId)!;
    expect(active.status).toBe("ACTIVE");
    expect(active.currentPeriodEnd).toBeInstanceOf(Date);

    // Fast-forward: the cycle has lapsed with no "renew now" reactivation
    // (that mechanism does not exist in the app yet — see this batch's
    // apply-progress notes). Mutate only the elapsed-time field directly
    // (equivalent to advancing a fake clock) so the cron's own real query +
    // real service-function logic runs against a row that otherwise came
    // entirely from the real checkout+webhook chain above.
    subscriptions.set(clubId, {
      ...subscriptions.get(clubId)!,
      currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    const firstSweep = await cronGet(
      new Request("https://app.example.com/api/cron/membership-grace-sweep", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect((await firstSweep.json()).manualExpired).toBe(1);
    const pastDue = subscriptions.get(clubId)!;
    expect(pastDue.status).toBe("PAST_DUE");
    expect(pastDue.pastDueUntil).toBeInstanceOf(Date);
    // Reservation access continues through the grace window (Club.status
    // stays ACTIVE — recordManualPeriodExpiredWithoutRenewal never touches
    // it). The MP-connect gate is a stricter, separate precondition though:
    // per design.md's "MP-connect gate" flow, `requireMembershipPaid` blocks
    // unless status is ACTIVE/TRIALING specifically, so PAST_DUE still
    // blocks new connect attempts (403) — matches
    // lib/mercadopago/membershipStatus.test.ts's own explicit
    // "is false for PAST_DUE" coverage.
    expect((await connectGet()).status).toBe(403);

    // Fast-forward past the grace deadline too.
    subscriptions.set(clubId, {
      ...subscriptions.get(clubId)!,
      pastDueUntil: new Date(Date.now() - 1000),
    });

    const secondSweep = await cronGet(
      new Request("https://app.example.com/api/cron/membership-grace-sweep", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect((await secondSweep.json()).manualLockedOut).toBe(1);
    expect(subscriptions.get(clubId)!.status).toBe("CANCELLED");
    expect(clubs.get(clubId)?.status).toBe("INACTIVE");
    expect((await connectGet()).status).toBe(403);
  });
});

// NOTE on why there is no "ANNUAL, no free trial configured" full HTTP
// chain test in this file (there previously was one, asserting an immediate
// `checkoutUrl` for plan PRO): every automated-price tier (BASIC/PRO/PLUS)
// always has a `welcomeFreeMonths` fallback in `PLAN_DETAILS`, and
// `resolveFreeTrialConfig` only ever returns `undefined` when BOTH the
// admin override AND that fallback are absent — there is no real config
// shape that disables the trial for a real automated-price tier (the only
// plan with `welcomeFreeMonths: null` is MAX, which is rejected with 400
// before reaching this branch at all). The OLD test's "success" was itself
// evidence of the very bug this batch fixes: it asserted an immediate
// preference/checkoutUrl for PRO, silently relying on the trial check never
// having been wired in the first place. This is the same structural
// limitation already accepted for MONTHLY (this file's AUTO/MANUAL describe
// blocks above also always go through a trial first for the same reason —
// no full "no trial" HTTP chain test exists for MONTHLY either). The
// no-trial preference-creation branch remains covered at the unit level in
// `app/api/clubs/membership/route.test.ts`'s ANNUAL describe block, which
// mocks `resolveFreeTrialConfig` directly to exercise it.

describe("End-to-end: ANNUAL membership — app-tracked trial (sdd-verify WARNING #1 fix)", () => {
  it("starts a genuine app-tracked trial with NO Mercado Pago object, then the cron sweep's previously-unreachable 'ANNUAL trial expiry' branch cancels it once trialEndsAt passes", async () => {
    const clubId = "club_annual_trial_1";
    seedOwner(clubId);
    await createPendingMembershipSubscription({
      clubId,
      plan: "PRO",
      currency: "ARS",
    });

    expect((await connectGet()).status).toBe(403);

    // Before this fix, this branch ALWAYS called `createMembershipPreference`
    // (attaching a real MP preference and returning a `checkoutUrl`) even
    // though PRO has a configured free trial — the confirmed sdd-verify gap.
    const checkoutResponse = await membershipPost(
      makeCheckoutRequest({ plan: "PRO", cycle: "ANNUAL" }),
    );
    expect(checkoutResponse.status).toBe(200);
    const checkoutBody = await checkoutResponse.json();
    expect(checkoutBody.checkoutUrl).toBeUndefined();
    expect(checkoutBody.subscription.status).toBe("TRIALING");
    // No MP object created at trial start — ANNUAL has no native
    // "authorize without charge" primitive for a one-off Checkout Pro
    // preference (design.md's "Trial start (ANNUAL)" workaround).
    expect(preferenceCreateMock).not.toHaveBeenCalled();
    const trialing = subscriptions.get(clubId)!;
    expect(trialing.mpPreferenceId).toBeNull();
    expect(trialing.mpPreapprovalId).toBeNull();
    expect(trialing.trialEndsAt).toBeInstanceOf(Date);

    // A TRIALING subscription already counts as "confirmed" for the
    // MP-connect gate, same as MONTHLY's trial — matches
    // `isMembershipConfirmed`/`requireMembershipPaid` treating ACTIVE and
    // TRIALING identically, regardless of billing cycle.
    expect((await connectGet()).status).toBe(307);

    // Fast-forward past trialEndsAt (equivalent to advancing a fake clock,
    // same technique already used by the MANUAL cron-sweep test above).
    subscriptions.set(clubId, {
      ...subscriptions.get(clubId)!,
      trialEndsAt: new Date(Date.now() - 1000),
    });

    // Before this fix, NOTHING ever created a row matching this cron
    // query (`cycle: ANNUAL, status: TRIALING, trialEndsAt <= now`), so this
    // branch was unreachable dead code giving false confidence the feature
    // worked. This assertion is the actual proof it is now reachable.
    const sweep = await cronGet(
      new Request("https://app.example.com/api/cron/membership-grace-sweep", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    const sweepBody = await sweep.json();
    expect(sweepBody.annualTrialsExpired).toBe(1);
    expect(sweepBody.failed).toBe(0);

    const cancelled = subscriptions.get(clubId)!;
    expect(cancelled.status).toBe("CANCELLED");
    expect(clubs.get(clubId)?.status).toBe("INACTIVE");
    expect((await connectGet()).status).toBe(403);
  });

  it("pays now during an ANNUAL trial via the checkout route, activates via the confirmed payment webhook, and a later sweep leaves the paid club alone (sdd-verify follow-up fix)", async () => {
    const clubId = "club_annual_trial_paynow_1";
    seedOwner(clubId);
    await createPendingMembershipSubscription({
      clubId,
      plan: "PRO",
      currency: "ARS",
    });

    // Trial starts with no MP object at all (same as the test above).
    const trialResponse = await membershipPost(
      makeCheckoutRequest({ plan: "PRO", cycle: "ANNUAL" }),
    );
    expect(trialResponse.status).toBe(200);
    expect(subscriptions.get(clubId)!.status).toBe("TRIALING");
    expect(subscriptions.get(clubId)!.mpPreferenceId).toBeNull();
    expect(preferenceCreateMock).not.toHaveBeenCalled();

    // Before this fix, calling the checkout route again here always 409'd
    // ("Cannot start a new membership checkout while subscription is
    // TRIALING") — there was NO way back into this route to ever generate
    // a payment link for an ANNUAL trial. This is the "pay now" call.
    preferenceCreateMock.mockResolvedValue({
      id: "pref_paynow_1",
      init_point: "https://mp.example.com/checkout/paynow",
    });

    const payNowResponse = await membershipPost(
      makeCheckoutRequest({ plan: "PRO", cycle: "ANNUAL" }),
    );
    expect(payNowResponse.status).toBe(200);
    const payNowBody = await payNowResponse.json();
    expect(payNowBody.checkoutUrl).toBe(
      "https://mp.example.com/checkout/paynow",
    );
    // Status stays TRIALING — generating the link never jumps straight to
    // ACTIVE, only the webhook does (spec's "Webhook-Only State
    // Confirmation").
    expect(payNowBody.subscription.status).toBe("TRIALING");
    const trialingWithPreference = subscriptions.get(clubId)!;
    expect(trialingWithPreference.status).toBe("TRIALING");
    expect(trialingWithPreference.mpPreferenceId).toBe("pref_paynow_1");

    // The webhook confirms the payment — real activation.
    paymentGetMock.mockResolvedValue({
      id: 888,
      status: "approved",
      external_reference: clubId,
    });
    const webhookResponse = await webhookPost(
      makePaymentWebhookRequest("pay_888", clubId),
    );
    expect(webhookResponse.status).toBe(200);
    expect(subscriptions.get(clubId)!.status).toBe("ACTIVE");
    expect((await connectGet()).status).toBe(307);

    // The cron's ANNUAL-trial-expiry query filters on `status: TRIALING` —
    // an already-paid-during-trial subscription must never be swept/
    // cancelled even if its stale `trialEndsAt` is in the past.
    subscriptions.set(clubId, {
      ...subscriptions.get(clubId)!,
      trialEndsAt: new Date(Date.now() - 1000),
    });
    const sweep = await cronGet(
      new Request("https://app.example.com/api/cron/membership-grace-sweep", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    const sweepBody = await sweep.json();
    expect(sweepBody.annualTrialsExpired).toBe(0);
    expect(sweepBody.failed).toBe(0);
    expect(subscriptions.get(clubId)!.status).toBe("ACTIVE");
    expect(clubs.get(clubId)?.status).toBe("ACTIVE");
    expect((await connectGet()).status).toBe(307);
  });

  it("pays now during an ANNUAL trial but the sweep runs BEFORE the webhook confirms it — leaves the in-flight-payment subscription alone (sdd-verify race-condition fix)", async () => {
    const clubId = "club_annual_trial_paynow_race_1";
    seedOwner(clubId);
    await createPendingMembershipSubscription({
      clubId,
      plan: "PRO",
      currency: "ARS",
    });

    const trialResponse = await membershipPost(
      makeCheckoutRequest({ plan: "PRO", cycle: "ANNUAL" }),
    );
    expect(trialResponse.status).toBe(200);
    expect(subscriptions.get(clubId)!.status).toBe("TRIALING");

    // Pay Now generates a real payment link — `mpPreferenceId` gets set,
    // but status deliberately stays TRIALING (webhook-only confirmation).
    preferenceCreateMock.mockResolvedValue({
      id: "pref_paynow_race_1",
      init_point: "https://mp.example.com/checkout/paynow-race",
    });
    const payNowResponse = await membershipPost(
      makeCheckoutRequest({ plan: "PRO", cycle: "ANNUAL" }),
    );
    expect(payNowResponse.status).toBe(200);
    const payNowBody = await payNowResponse.json();
    expect(payNowBody.checkoutUrl).toBe(
      "https://mp.example.com/checkout/paynow-race",
    );
    expect(subscriptions.get(clubId)!.status).toBe("TRIALING");
    expect(subscriptions.get(clubId)!.mpPreferenceId).toBe(
      "pref_paynow_race_1",
    );

    // trialEndsAt passes WHILE the webhook confirmation is still in flight —
    // the exact narrow race window flagged by sdd-verify. Before this fix,
    // the cron's ANNUAL-trial-expiry query only checked
    // `cycle/status/trialEndsAt` and would wrongly cancel a subscription
    // that already has a payment attempt in progress.
    subscriptions.set(clubId, {
      ...subscriptions.get(clubId)!,
      trialEndsAt: new Date(Date.now() - 1000),
    });
    const sweep = await cronGet(
      new Request("https://app.example.com/api/cron/membership-grace-sweep", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    const sweepBody = await sweep.json();
    expect(sweepBody.annualTrialsExpired).toBe(0);
    expect(sweepBody.failed).toBe(0);
    // Left exactly as-is — no premature cancellation. The already-in-flight
    // webhook (or the existing payment/webhook handling generally) is what
    // eventually resolves this row, not this cron.
    expect(subscriptions.get(clubId)!.status).toBe("TRIALING");
    expect(clubs.get(clubId)?.status).toBe("ACTIVE");
  });

  it("still activates via a payment webhook that lands during the trial, before the cron sweep ever runs — and a later sweep leaves the now-ACTIVE club alone", async () => {
    const clubId = "club_annual_trial_2";
    seedOwner(clubId);
    await createPendingMembershipSubscription({
      clubId,
      plan: "BASIC",
      currency: "ARS",
    });

    await membershipPost(
      makeCheckoutRequest({ plan: "BASIC", cycle: "ANNUAL" }),
    );
    expect(subscriptions.get(clubId)!.status).toBe("TRIALING");

    // `handlePaymentTopic` resolves the club purely from the `clubId` query
    // param + the re-fetched payment's `external_reference` — it never
    // requires a pre-attached `mpPreferenceId`, so a real one-time payment
    // completed through any channel during the trial still confirms it.
    paymentGetMock.mockResolvedValue({
      id: 777,
      status: "approved",
      external_reference: clubId,
    });
    const webhookResponse = await webhookPost(
      makePaymentWebhookRequest("pay_777", clubId),
    );
    expect(webhookResponse.status).toBe(200);
    expect(subscriptions.get(clubId)!.status).toBe("ACTIVE");
    expect((await connectGet()).status).toBe(307);

    // The cron's ANNUAL-trial-expiry query filters on `status: TRIALING`, so
    // a since-activated subscription must never be swept even if its stale
    // `trialEndsAt` is still in the past.
    subscriptions.set(clubId, {
      ...subscriptions.get(clubId)!,
      trialEndsAt: new Date(Date.now() - 1000),
    });
    const sweep = await cronGet(
      new Request("https://app.example.com/api/cron/membership-grace-sweep", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect((await sweep.json()).annualTrialsExpired).toBe(0);
    expect(subscriptions.get(clubId)!.status).toBe("ACTIVE");
    expect((await connectGet()).status).toBe(307);
  });
});

describe("GET /api/clubs/membership — post-archive fix: lazy PENDING seeding for pre-existing clubs (found via live smoke test)", () => {
  it("returns 200 with a REAL, persisted PENDING row for a club that predates onboarding's Phase 6.2 seeding — never a 404, and never a synthetic in-memory-only object", async () => {
    const clubId = "club_pre_existing_1";
    // Deliberately do NOT call `createPendingMembershipSubscription` here —
    // this reproduces a real club created before Phase 6.2's onboarding-time
    // seeding existed, which has ZERO rows in `club_membership_subscriptions`.
    seedOwner(clubId);
    expect(subscriptions.has(clubId)).toBe(false);

    const response = await membershipGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subscription.status).toBe("PENDING");
    expect(body.subscription.clubId).toBe(clubId);
    // Genuinely persisted — not a synthetic in-memory-only object.
    expect(subscriptions.has(clubId)).toBe(true);
    expect(subscriptions.get(clubId)!.id).toBe(body.subscription.id);
  });

  it("finds the SAME persisted row on a second GET — never creates a duplicate", async () => {
    const clubId = "club_pre_existing_2";
    seedOwner(clubId);

    const first = await (await membershipGet()).json();
    const second = await (await membershipGet()).json();

    expect(first.subscription.id).toBe(second.subscription.id);
    expect(subscriptions.size).toBe(1);
  });

  it("derives plan/currency from the Club row itself (BASIC default plan, ARS from the fixture) since GET has no request body to read them from", async () => {
    const clubId = "club_pre_existing_3";
    seedOwner(clubId);

    const body = await (await membershipGet()).json();

    expect(body.subscription.plan).toBe("BASIC");
    expect(body.subscription.currency).toBe("ARS");
    expect(body.subscription.cycle).toBe("MONTHLY");
    expect(body.subscription.renewalMode).toBe("AUTO");
  });
});
