import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    membershipTrialConfig: { findUnique: vi.fn() },
    club: { findUnique: vi.fn() },
  },
}));

vi.mock("@/core/billing/services/membership.service", () => ({
  getMembershipSubscription: vi.fn(),
  seedPendingMembershipSubscriptionFromClub: vi.fn(),
  attachPendingPreapproval: vi.fn(),
  attachPendingPreference: vi.fn(),
  startTrial: vi.fn(),
}));

vi.mock("@/lib/mercadopago/preapprovalPlans", () => ({
  getOrCreateMembershipPreapprovalPlanId: vi.fn(),
  resolveFreeTrialConfig: vi.fn(),
}));

vi.mock("@/lib/mercadopago/membershipPreapprovals", () => ({
  createMembershipPreapproval: vi.fn(),
}));

vi.mock("@/lib/mercadopago/platformPreferences", () => ({
  createMembershipPreference: vi.fn(),
}));

import { requireOwnerClub } from "../_lib/require-owner";
import { prisma } from "@/infrastructure/db/client";
import {
  getMembershipSubscription,
  seedPendingMembershipSubscriptionFromClub,
  attachPendingPreapproval,
  attachPendingPreference,
  startTrial,
} from "@/core/billing/services/membership.service";
import {
  getOrCreateMembershipPreapprovalPlanId,
  resolveFreeTrialConfig,
} from "@/lib/mercadopago/preapprovalPlans";
import { createMembershipPreapproval } from "@/lib/mercadopago/membershipPreapprovals";
import { createMembershipPreference } from "@/lib/mercadopago/platformPreferences";
import { GET, POST } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const trialConfigFindUniqueMock = prisma.membershipTrialConfig
  .findUnique as ReturnType<typeof vi.fn>;
const clubFindUniqueMock = prisma.club.findUnique as ReturnType<typeof vi.fn>;
const getMembershipSubscriptionMock = getMembershipSubscription as ReturnType<
  typeof vi.fn
>;
const seedPendingMembershipSubscriptionFromClubMock =
  seedPendingMembershipSubscriptionFromClub as ReturnType<typeof vi.fn>;
const attachPendingPreapprovalMock = attachPendingPreapproval as ReturnType<
  typeof vi.fn
>;
const attachPendingPreferenceMock = attachPendingPreference as ReturnType<
  typeof vi.fn
>;
const startTrialMock = startTrial as ReturnType<typeof vi.fn>;
const getOrCreateMembershipPreapprovalPlanIdMock =
  getOrCreateMembershipPreapprovalPlanId as ReturnType<typeof vi.fn>;
const resolveFreeTrialConfigMock = resolveFreeTrialConfig as ReturnType<
  typeof vi.fn
>;
const createMembershipPreapprovalMock =
  createMembershipPreapproval as ReturnType<typeof vi.fn>;
const createMembershipPreferenceMock = createMembershipPreference as ReturnType<
  typeof vi.fn
>;

const OWNER_OK = { ok: true, context: { userId: "user_1", clubId: "club_1" } };

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/clubs/membership", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function subscriptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    clubId: "club_1",
    plan: "PRO",
    pendingPlan: null,
    cycle: "MONTHLY",
    pendingCycle: null,
    renewalMode: "AUTO",
    status: "PENDING",
    currency: "ARS",
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
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  requireOwnerClubMock.mockReset();
  trialConfigFindUniqueMock.mockReset();
  clubFindUniqueMock.mockReset();
  getMembershipSubscriptionMock.mockReset();
  seedPendingMembershipSubscriptionFromClubMock.mockReset();
  attachPendingPreapprovalMock.mockReset();
  attachPendingPreferenceMock.mockReset();
  startTrialMock.mockReset();
  getOrCreateMembershipPreapprovalPlanIdMock.mockReset();
  resolveFreeTrialConfigMock.mockReset();
  createMembershipPreapprovalMock.mockReset();
  createMembershipPreferenceMock.mockReset();

  requireOwnerClubMock.mockResolvedValue(OWNER_OK);
});

describe("GET /api/clubs/membership", () => {
  it("returns the owner's response when not an owner", async () => {
    const unauthorized = {
      ok: false,
      response: new Response(null, { status: 401 }),
    };
    requireOwnerClubMock.mockResolvedValue(unauthorized);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getMembershipSubscriptionMock).not.toHaveBeenCalled();
  });

  it("lazily seeds a PENDING subscription and returns 200 when the club has none yet (post-archive fix — a club that predates onboarding's Phase 6.2 seeding must not 404)", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(null);
    seedPendingMembershipSubscriptionFromClubMock.mockResolvedValue(
      subscriptionRow({ status: "PENDING" }),
    );

    const response = await GET();
    const body = await response.json();

    expect(seedPendingMembershipSubscriptionFromClubMock).toHaveBeenCalledWith({
      clubId: "club_1",
    });
    expect(response.status).toBe(200);
    expect(body.subscription.status).toBe("PENDING");
  });

  it("returns the subscription snapshot for the caller's own club without seeding when one already exists", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(subscriptionRow());

    const response = await GET();
    const body = await response.json();

    expect(getMembershipSubscriptionMock).toHaveBeenCalledWith("club_1");
    expect(
      seedPendingMembershipSubscriptionFromClubMock,
    ).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(body.subscription.clubId).toBe("club_1");
  });
});

describe("POST /api/clubs/membership", () => {
  it("returns the owner's response when not an owner", async () => {
    const forbidden = {
      ok: false,
      response: new Response(null, { status: 403 }),
    };
    requireOwnerClubMock.mockResolvedValue(forbidden);

    const response = await POST(
      makePostRequest({ plan: "PRO", cycle: "ANNUAL" }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects an invalid plan with 400", async () => {
    const response = await POST(
      makePostRequest({ plan: "ENTERPRISE", cycle: "ANNUAL" }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects MONTHLY billing missing renewalMode/payerEmail/cardTokenId with 400", async () => {
    const response = await POST(
      makePostRequest({ plan: "PRO", cycle: "MONTHLY" }),
    );

    expect(response.status).toBe(400);
    expect(getMembershipSubscriptionMock).not.toHaveBeenCalled();
  });

  it("rejects MAX plan for MONTHLY checkout with 400 (no fixed monthly price — contact-us tier)", async () => {
    const response = await POST(
      makePostRequest({
        plan: "MAX",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        payerEmail: "owner@example.com",
        cardTokenId: "card_tok_1",
      }),
    );

    expect(response.status).toBe(400);
    expect(getOrCreateMembershipPreapprovalPlanIdMock).not.toHaveBeenCalled();
  });

  it("rejects MAX plan for ANNUAL checkout with 400 (no fixed annual price — contact-us tier)", async () => {
    const response = await POST(
      makePostRequest({ plan: "MAX", cycle: "ANNUAL" }),
    );

    expect(response.status).toBe(400);
    expect(createMembershipPreferenceMock).not.toHaveBeenCalled();
  });

  it("returns 409 when a checkout is already in progress or the subscription is not PENDING", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "ACTIVE" }),
    );

    const response = await POST(
      makePostRequest({ plan: "PRO", cycle: "ANNUAL" }),
    );

    expect(response.status).toBe(409);
    expect(createMembershipPreferenceMock).not.toHaveBeenCalled();
  });

  it("returns 409 for a TRIALING MONTHLY subscription requesting ANNUAL pay-now (pay-now only applies to an ANNUAL trial)", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "TRIALING", cycle: "MONTHLY" }),
    );

    const response = await POST(
      makePostRequest({ plan: "PRO", cycle: "ANNUAL" }),
    );

    expect(response.status).toBe(409);
    expect(createMembershipPreferenceMock).not.toHaveBeenCalled();
  });

  it("returns 409 for a CANCELLED subscription requesting ANNUAL (terminal status, no pay-now exception applies)", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "CANCELLED", cycle: "ANNUAL" }),
    );

    const response = await POST(
      makePostRequest({ plan: "PRO", cycle: "ANNUAL" }),
    );

    expect(response.status).toBe(409);
    expect(createMembershipPreferenceMock).not.toHaveBeenCalled();
  });

  it("returns 409 for a TRIALING ANNUAL subscription requesting MONTHLY (cycle mismatch, no pay-now exception applies)", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "TRIALING", cycle: "ANNUAL" }),
    );

    const response = await POST(
      makePostRequest({
        plan: "PRO",
        cycle: "MONTHLY",
        renewalMode: "AUTO",
        payerEmail: "owner@example.com",
        cardTokenId: "card_tok_1",
      }),
    );

    expect(response.status).toBe(409);
    expect(getOrCreateMembershipPreapprovalPlanIdMock).not.toHaveBeenCalled();
  });

  it("seeds a fresh PENDING subscription (via the shared seed helper) when none exists yet", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(null);
    seedPendingMembershipSubscriptionFromClubMock.mockResolvedValue(
      subscriptionRow({ status: "PENDING" }),
    );
    createMembershipPreferenceMock.mockResolvedValue({
      checkoutUrl: "https://mp.example.com/checkout",
      preferenceId: "pref_1",
    });
    attachPendingPreferenceMock.mockResolvedValue(
      subscriptionRow({ status: "PENDING", mpPreferenceId: "pref_1" }),
    );

    const response = await POST(
      makePostRequest({ plan: "PRO", cycle: "ANNUAL" }),
    );

    expect(seedPendingMembershipSubscriptionFromClubMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_1",
        plan: "PRO",
        cycle: "ANNUAL",
      }),
    );
    expect(response.status).toBe(200);
  });

  describe("MONTHLY", () => {
    const monthlyBody = {
      plan: "PRO",
      cycle: "MONTHLY",
      renewalMode: "AUTO",
      payerEmail: "owner@example.com",
      cardTokenId: "card_tok_1",
    };

    it("creates the preapproval_plan BEFORE creating the preapproval", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(subscriptionRow());
      getOrCreateMembershipPreapprovalPlanIdMock.mockResolvedValue({
        id: "plan_1",
      });
      createMembershipPreapprovalMock.mockResolvedValue({
        id: "preap_1",
        status: "authorized",
      });
      trialConfigFindUniqueMock.mockResolvedValue(null);
      resolveFreeTrialConfigMock.mockReturnValue(undefined);
      attachPendingPreapprovalMock.mockResolvedValue(
        subscriptionRow({ mpPreapprovalId: "preap_1" }),
      );

      await POST(makePostRequest(monthlyBody));

      const planOrder =
        getOrCreateMembershipPreapprovalPlanIdMock.mock.invocationCallOrder[0];
      const preapprovalOrder =
        createMembershipPreapprovalMock.mock.invocationCallOrder[0];
      expect(planOrder).toBeLessThan(preapprovalOrder);
      expect(createMembershipPreapprovalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: "club_1",
          preapprovalPlanId: "plan_1",
          payerEmail: "owner@example.com",
          cardTokenId: "card_tok_1",
        }),
      );
    });

    it("calls attachPendingPreapproval (not startTrial) when the tier has no free trial configured", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(subscriptionRow());
      getOrCreateMembershipPreapprovalPlanIdMock.mockResolvedValue({
        id: "plan_1",
      });
      createMembershipPreapprovalMock.mockResolvedValue({
        id: "preap_1",
        status: "authorized",
      });
      trialConfigFindUniqueMock.mockResolvedValue(null);
      resolveFreeTrialConfigMock.mockReturnValue(undefined);
      attachPendingPreapprovalMock.mockResolvedValue(
        subscriptionRow({ mpPreapprovalId: "preap_1" }),
      );

      const response = await POST(makePostRequest(monthlyBody));
      const body = await response.json();

      expect(attachPendingPreapprovalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: "club_1",
          mpPreapprovalId: "preap_1",
        }),
      );
      expect(startTrialMock).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(body.mpPreapprovalId).toBe("preap_1");
    });

    it("calls startTrial (not attachPendingPreapproval) when the tier has a free trial configured", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(subscriptionRow());
      getOrCreateMembershipPreapprovalPlanIdMock.mockResolvedValue({
        id: "plan_1",
      });
      createMembershipPreapprovalMock.mockResolvedValue({
        id: "preap_1",
        status: "authorized",
      });
      trialConfigFindUniqueMock.mockResolvedValue({ trialDays: 14 });
      resolveFreeTrialConfigMock.mockReturnValue({
        frequency: 14,
        frequency_type: "days",
      });
      startTrialMock.mockResolvedValue(
        subscriptionRow({ status: "TRIALING", mpPreapprovalId: "preap_1" }),
      );

      const response = await POST(makePostRequest(monthlyBody));

      expect(startTrialMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: "club_1",
          mpPreapprovalId: "preap_1",
          trialOverrideDays: 14,
        }),
      );
      expect(attachPendingPreapprovalMock).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("returns 500 when Mercado Pago fails to create the preapproval", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(subscriptionRow());
      getOrCreateMembershipPreapprovalPlanIdMock.mockResolvedValue({
        id: "plan_1",
      });
      createMembershipPreapprovalMock.mockRejectedValue(new Error("MP down"));
      trialConfigFindUniqueMock.mockResolvedValue(null);
      resolveFreeTrialConfigMock.mockReturnValue(undefined);

      const response = await POST(makePostRequest(monthlyBody));

      expect(response.status).toBe(500);
      expect(attachPendingPreapprovalMock).not.toHaveBeenCalled();
    });
  });

  describe("ANNUAL", () => {
    it("creates a one-time Checkout Pro preference and returns its checkoutUrl when the tier has no free trial configured", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(
        subscriptionRow({ cycle: "ANNUAL" }),
      );
      trialConfigFindUniqueMock.mockResolvedValue(null);
      resolveFreeTrialConfigMock.mockReturnValue(undefined);
      createMembershipPreferenceMock.mockResolvedValue({
        checkoutUrl: "https://mp.example.com/checkout",
        preferenceId: "pref_1",
      });
      attachPendingPreferenceMock.mockResolvedValue(
        subscriptionRow({ cycle: "ANNUAL", mpPreferenceId: "pref_1" }),
      );

      const response = await POST(
        makePostRequest({ plan: "PRO", cycle: "ANNUAL" }),
      );
      const body = await response.json();

      expect(createMembershipPreferenceMock).toHaveBeenCalledWith(
        expect.objectContaining({ clubId: "club_1", plan: "PRO" }),
      );
      expect(attachPendingPreferenceMock).toHaveBeenCalledWith(
        expect.objectContaining({ clubId: "club_1", mpPreferenceId: "pref_1" }),
      );
      expect(startTrialMock).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(body.checkoutUrl).toBe("https://mp.example.com/checkout");
    });

    // This is the confirmed WARNING from sdd-verify: ANNUAL never started a
    // trial, always going straight to a one-time preference/payment link —
    // contradicting design.md's ANNUAL-trial workaround ("keep app-tracked
    // trialEndsAt gate, defer checkout until trial ends") and leaving the
    // cron sweep's "ANNUAL trial expiry" branch permanently unreachable
    // dead code. ANNUAL has no native MP "authorize without charge"
    // primitive (unlike MONTHLY's preapproval_plan free_trial), so — per
    // design's own workaround — starting the trial creates NO Mercado Pago
    // object at all: no preference, no checkoutUrl, no payment method
    // authorized upfront.
    it("calls startTrial (not createMembershipPreference) when the tier has a free trial configured, with no MP object and no checkoutUrl", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(
        subscriptionRow({ cycle: "ANNUAL" }),
      );
      trialConfigFindUniqueMock.mockResolvedValue({ trialDays: 14 });
      resolveFreeTrialConfigMock.mockReturnValue({
        frequency: 14,
        frequency_type: "days",
      });
      startTrialMock.mockResolvedValue(
        subscriptionRow({ cycle: "ANNUAL", status: "TRIALING" }),
      );

      const response = await POST(
        makePostRequest({ plan: "PRO", cycle: "ANNUAL" }),
      );
      const body = await response.json();

      expect(startTrialMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: "club_1",
          plan: "PRO",
          cycle: "ANNUAL",
          trialOverrideDays: 14,
        }),
      );
      expect(createMembershipPreferenceMock).not.toHaveBeenCalled();
      expect(attachPendingPreferenceMock).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(body.subscription.status).toBe("TRIALING");
      expect(body.checkoutUrl).toBeUndefined();
    });

    it("returns 500 when Mercado Pago fails to create the preference", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(
        subscriptionRow({ cycle: "ANNUAL" }),
      );
      trialConfigFindUniqueMock.mockResolvedValue(null);
      resolveFreeTrialConfigMock.mockReturnValue(undefined);
      createMembershipPreferenceMock.mockRejectedValue(new Error("MP down"));

      const response = await POST(
        makePostRequest({ plan: "PRO", cycle: "ANNUAL" }),
      );

      expect(response.status).toBe(500);
      expect(attachPendingPreferenceMock).not.toHaveBeenCalled();
    });

    // The confirmed follow-up gap: before this fix, a TRIALING ANNUAL
    // subscription could never reach this route again (the early PENDING
    // guard 409'd every time), so it had no way to ever generate a payment
    // link and always expired via the cron sweep. "Pay now" skips trial
    // resolution entirely and creates the real one-time preference, keeping
    // status at TRIALING until the webhook confirms payment.
    it("generates a payment preference for a TRIALING ANNUAL subscription without re-evaluating trial eligibility (pay-now)", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(
        subscriptionRow({ status: "TRIALING", cycle: "ANNUAL" }),
      );
      createMembershipPreferenceMock.mockResolvedValue({
        checkoutUrl: "https://mp.example.com/checkout",
        preferenceId: "pref_paynow_1",
      });
      attachPendingPreferenceMock.mockResolvedValue(
        subscriptionRow({
          status: "TRIALING",
          cycle: "ANNUAL",
          mpPreferenceId: "pref_paynow_1",
        }),
      );

      const response = await POST(
        makePostRequest({ plan: "PRO", cycle: "ANNUAL" }),
      );
      const body = await response.json();

      // No trial-eligibility check is re-run for the pay-now path — the
      // owner is explicitly asking to pay, not to start a trial.
      expect(trialConfigFindUniqueMock).not.toHaveBeenCalled();
      expect(resolveFreeTrialConfigMock).not.toHaveBeenCalled();
      expect(startTrialMock).not.toHaveBeenCalled();

      expect(createMembershipPreferenceMock).toHaveBeenCalledWith(
        expect.objectContaining({ clubId: "club_1", plan: "PRO" }),
      );
      expect(attachPendingPreferenceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: "club_1",
          mpPreferenceId: "pref_paynow_1",
        }),
      );
      expect(response.status).toBe(200);
      expect(body.checkoutUrl).toBe("https://mp.example.com/checkout");
      expect(body.subscription.status).toBe("TRIALING");
    });
  });
});
