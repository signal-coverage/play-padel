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
  startTrial: vi.fn(),
  changeTrialPlan: vi.fn(),
  saveMembershipPayerIdentification: vi.fn(),
}));

vi.mock("@/lib/mercadopago/preapprovalPlans", () => ({
  getOrCreateMembershipPreapprovalPlanId: vi.fn(),
  resolveFreeTrialConfig: vi.fn(),
}));

vi.mock("@/lib/mercadopago/membershipPreapprovals", () => ({
  createMembershipPreapproval: vi.fn(),
  updateMembershipPreapprovalAmount: vi.fn(),
}));

import { requireOwnerClub } from "../_lib/require-owner";
import { prisma } from "@/infrastructure/db/client";
import {
  getMembershipSubscription,
  seedPendingMembershipSubscriptionFromClub,
  attachPendingPreapproval,
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
import { GET, POST, PATCH } from "./route";

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
const startTrialMock = startTrial as ReturnType<typeof vi.fn>;
const getOrCreateMembershipPreapprovalPlanIdMock =
  getOrCreateMembershipPreapprovalPlanId as ReturnType<typeof vi.fn>;
const resolveFreeTrialConfigMock = resolveFreeTrialConfig as ReturnType<
  typeof vi.fn
>;
const createMembershipPreapprovalMock =
  createMembershipPreapproval as ReturnType<typeof vi.fn>;
const updateMembershipPreapprovalAmountMock =
  updateMembershipPreapprovalAmount as ReturnType<typeof vi.fn>;
const changeTrialPlanMock = changeTrialPlan as ReturnType<typeof vi.fn>;
const saveMembershipPayerIdentificationMock =
  saveMembershipPayerIdentification as ReturnType<typeof vi.fn>;

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
  startTrialMock.mockReset();
  getOrCreateMembershipPreapprovalPlanIdMock.mockReset();
  resolveFreeTrialConfigMock.mockReset();
  createMembershipPreapprovalMock.mockReset();
  updateMembershipPreapprovalAmountMock.mockReset();
  changeTrialPlanMock.mockReset();
  saveMembershipPayerIdentificationMock.mockReset();

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

  it("rejects ANNUAL billing missing renewalMode/payerEmail/cardTokenId with 400 (both cycles now require a tokenized card)", async () => {
    const response = await POST(
      makePostRequest({ plan: "PRO", cycle: "ANNUAL" }),
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
      makePostRequest({
        plan: "MAX",
        cycle: "ANNUAL",
        renewalMode: "AUTO",
        payerEmail: "owner@example.com",
        cardTokenId: "card_tok_1",
      }),
    );

    expect(response.status).toBe(400);
    expect(getOrCreateMembershipPreapprovalPlanIdMock).not.toHaveBeenCalled();
  });

  it("returns 409 when a checkout is already in progress or the subscription is not PENDING", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "ACTIVE" }),
    );

    const response = await POST(
      makePostRequest({
        plan: "PRO",
        cycle: "ANNUAL",
        renewalMode: "AUTO",
        payerEmail: "owner@example.com",
        cardTokenId: "card_tok_1",
      }),
    );

    expect(response.status).toBe(409);
    expect(getOrCreateMembershipPreapprovalPlanIdMock).not.toHaveBeenCalled();
  });

  // Confirms the old "pay now" exception (a TRIALING+ANNUAL subscription
  // requesting ANNUAL again used to be allowed through as a special case) is
  // genuinely gone — every non-PENDING status now 409s unconditionally, no
  // exceptions, on either cycle. ANNUAL trials get a real preapproval at
  // signup now (same as MONTHLY), so there is no more "generate a payment
  // link later" re-entry to support.
  it("returns 409 for a TRIALING ANNUAL subscription requesting ANNUAL again (no more pay-now exception)", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "TRIALING", cycle: "ANNUAL" }),
    );

    const response = await POST(
      makePostRequest({
        plan: "PRO",
        cycle: "ANNUAL",
        renewalMode: "AUTO",
        payerEmail: "owner@example.com",
        cardTokenId: "card_tok_1",
      }),
    );

    expect(response.status).toBe(409);
    expect(getOrCreateMembershipPreapprovalPlanIdMock).not.toHaveBeenCalled();
  });

  it("returns 409 for a CANCELLED subscription (terminal status)", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "CANCELLED", cycle: "ANNUAL" }),
    );

    const response = await POST(
      makePostRequest({
        plan: "PRO",
        cycle: "ANNUAL",
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
      subscriptionRow({ status: "PENDING", cycle: "ANNUAL" }),
    );
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
      subscriptionRow({ cycle: "ANNUAL", mpPreapprovalId: "preap_1" }),
    );

    const response = await POST(
      makePostRequest({
        plan: "PRO",
        cycle: "ANNUAL",
        renewalMode: "AUTO",
        payerEmail: "owner@example.com",
        cardTokenId: "card_tok_1",
      }),
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

    it("creates the preapproval_plan BEFORE creating the preapproval, threading cycle through both calls", async () => {
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
      expect(getOrCreateMembershipPreapprovalPlanIdMock).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "PRO", cycle: "MONTHLY" }),
      );
      expect(createMembershipPreapprovalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: "club_1",
          preapprovalPlanId: "plan_1",
          cycle: "MONTHLY",
          payerEmail: "owner@example.com",
          cardTokenId: "card_tok_1",
          transactionAmount: 59000,
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

    it("saves the confirmed identification and returns its snapshot when saveIdentification is true and identification is present", async () => {
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
      saveMembershipPayerIdentificationMock.mockResolvedValue(
        subscriptionRow({
          mpPreapprovalId: "preap_1",
          payerIdentificationType: "CUIT",
          payerIdentificationNumber: "30-12345678-9",
        }),
      );

      const response = await POST(
        makePostRequest({
          ...monthlyBody,
          identification: { type: "CUIT", number: "30-12345678-9" },
          saveIdentification: true,
        }),
      );
      const body = await response.json();

      expect(saveMembershipPayerIdentificationMock).toHaveBeenCalledWith(
        "club_1",
        { type: "CUIT", number: "30-12345678-9" },
      );
      expect(response.status).toBe(200);
      expect(body.subscription.payerIdentificationType).toBe("CUIT");
      expect(body.subscription.payerIdentificationNumber).toBe("30-12345678-9");
      expect(body.mpPreapprovalId).toBe("preap_1");
    });

    it("behaves exactly as before (no saveMembershipPayerIdentification call) when neither identification nor saveIdentification is present", async () => {
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

      expect(saveMembershipPayerIdentificationMock).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(body.mpPreapprovalId).toBe("preap_1");
    });

    it("never calls saveMembershipPayerIdentification with incomplete data (saveIdentification true but no identification)", async () => {
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

      const response = await POST(
        makePostRequest({ ...monthlyBody, saveIdentification: true }),
      );

      expect(saveMembershipPayerIdentificationMock).not.toHaveBeenCalled();
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

  // ANNUAL now goes through the exact same preapproval mechanism MONTHLY
  // does — the only real difference is a 12-month `auto_recurring.frequency`
  // instead of 1 (enforced inside getOrCreateMembershipPreapprovalPlanId/
  // createMembershipPreapproval themselves, not this route) and
  // PLAN_DETAILS.annualPrice instead of monthlyPrice. These tests mirror
  // the MONTHLY block above almost exactly.
  describe("ANNUAL", () => {
    const annualBody = {
      plan: "PRO",
      cycle: "ANNUAL",
      renewalMode: "AUTO",
      payerEmail: "owner@example.com",
      cardTokenId: "card_tok_1",
    };

    it("creates the preapproval_plan and preapproval with cycle: ANNUAL and the annual price, exactly like MONTHLY but for the annual amount", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(
        subscriptionRow({ cycle: "ANNUAL" }),
      );
      getOrCreateMembershipPreapprovalPlanIdMock.mockResolvedValue({
        id: "plan_annual_1",
      });
      createMembershipPreapprovalMock.mockResolvedValue({
        id: "preap_annual_1",
        status: "authorized",
      });
      trialConfigFindUniqueMock.mockResolvedValue(null);
      resolveFreeTrialConfigMock.mockReturnValue(undefined);
      attachPendingPreapprovalMock.mockResolvedValue(
        subscriptionRow({ cycle: "ANNUAL", mpPreapprovalId: "preap_annual_1" }),
      );

      const response = await POST(makePostRequest(annualBody));
      const body = await response.json();

      expect(getOrCreateMembershipPreapprovalPlanIdMock).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "PRO", cycle: "ANNUAL" }),
      );
      expect(createMembershipPreapprovalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: "club_1",
          preapprovalPlanId: "plan_annual_1",
          cycle: "ANNUAL",
          transactionAmount: 590000,
        }),
      );
      expect(attachPendingPreapprovalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: "club_1",
          cycle: "ANNUAL",
          mpPreapprovalId: "preap_annual_1",
        }),
      );
      expect(response.status).toBe(200);
      expect(body.mpPreapprovalId).toBe("preap_annual_1");
      // No more one-time payment link for ANNUAL — it's a real preapproval now.
      expect(body.checkoutUrl).toBeUndefined();
    });

    it("calls startTrial (not attachPendingPreapproval) when the tier has a free trial configured — trial is authorized-but-uncharged, same as MONTHLY", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(
        subscriptionRow({ cycle: "ANNUAL" }),
      );
      getOrCreateMembershipPreapprovalPlanIdMock.mockResolvedValue({
        id: "plan_annual_1",
      });
      createMembershipPreapprovalMock.mockResolvedValue({
        id: "preap_annual_1",
        status: "authorized",
      });
      trialConfigFindUniqueMock.mockResolvedValue({ trialDays: 60 });
      resolveFreeTrialConfigMock.mockReturnValue({
        frequency: 60,
        frequency_type: "days",
      });
      startTrialMock.mockResolvedValue(
        subscriptionRow({
          cycle: "ANNUAL",
          status: "TRIALING",
          mpPreapprovalId: "preap_annual_1",
        }),
      );

      const response = await POST(makePostRequest(annualBody));
      const body = await response.json();

      expect(startTrialMock).toHaveBeenCalledWith(
        expect.objectContaining({
          clubId: "club_1",
          plan: "PRO",
          cycle: "ANNUAL",
          trialOverrideDays: 60,
          mpPreapprovalId: "preap_annual_1",
        }),
      );
      expect(attachPendingPreapprovalMock).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(body.subscription.status).toBe("TRIALING");
      // The card WAS authorized (unlike the old Checkout-Pro flow) — a real
      // mpPreapprovalId is already on file even while TRIALING.
      expect(body.mpPreapprovalId).toBe("preap_annual_1");
    });

    it("returns 500 when Mercado Pago fails to create the preapproval", async () => {
      getMembershipSubscriptionMock.mockResolvedValue(
        subscriptionRow({ cycle: "ANNUAL" }),
      );
      getOrCreateMembershipPreapprovalPlanIdMock.mockResolvedValue({
        id: "plan_annual_1",
      });
      createMembershipPreapprovalMock.mockRejectedValue(new Error("MP down"));
      trialConfigFindUniqueMock.mockResolvedValue(null);
      resolveFreeTrialConfigMock.mockReturnValue(undefined);

      const response = await POST(makePostRequest(annualBody));

      expect(response.status).toBe(500);
      expect(attachPendingPreapprovalMock).not.toHaveBeenCalled();
      expect(startTrialMock).not.toHaveBeenCalled();
    });
  });
});

// Immediate (not deferred-to-next-renewal) plan tier change, valid ONLY
// while the subscription is TRIALING — since no real charge has happened
// yet on either cycle, there is nothing to prorate. Deliberately separate
// from `requestPlanChange` (ACTIVE-only, deferred via pendingPlan), which
// this route never touches.
describe("PATCH /api/clubs/membership", () => {
  function makePatchRequest(body: unknown) {
    return new NextRequest("http://localhost/api/clubs/membership", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns the owner's response when not an owner", async () => {
    const unauthorized = {
      ok: false,
      response: new Response(null, { status: 401 }),
    };
    requireOwnerClubMock.mockResolvedValue(unauthorized);

    const response = await PATCH(makePatchRequest({ plan: "PRO" }));

    expect(response.status).toBe(401);
    expect(getMembershipSubscriptionMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid plan with 400", async () => {
    const response = await PATCH(makePatchRequest({ plan: "ENTERPRISE" }));

    expect(response.status).toBe(400);
    expect(getMembershipSubscriptionMock).not.toHaveBeenCalled();
  });

  it("returns 404 when no subscription exists for the club", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ plan: "PRO" }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBeTruthy();
    expect(changeTrialPlanMock).not.toHaveBeenCalled();
  });

  it("returns 409 when the subscription is not TRIALING", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "ACTIVE" }),
    );

    const response = await PATCH(makePatchRequest({ plan: "PRO" }));

    expect(response.status).toBe(409);
    expect(changeTrialPlanMock).not.toHaveBeenCalled();
    expect(updateMembershipPreapprovalAmountMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an unautomatable plan+cycle combo (MAX has no fixed price on either cycle)", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({ status: "TRIALING", cycle: "MONTHLY" }),
    );

    const response = await PATCH(makePatchRequest({ plan: "MAX" }));

    expect(response.status).toBe(400);
    expect(changeTrialPlanMock).not.toHaveBeenCalled();
    expect(updateMembershipPreapprovalAmountMock).not.toHaveBeenCalled();
  });

  it("updates the Mercado Pago preapproval amount and the DB plan for a TRIALING MONTHLY subscription with an mpPreapprovalId set", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({
        status: "TRIALING",
        cycle: "MONTHLY",
        currency: "ARS",
        plan: "BASIC",
        mpPreapprovalId: "preap_1",
      }),
    );
    updateMembershipPreapprovalAmountMock.mockResolvedValue({
      id: "preap_1",
      status: "authorized",
    });
    changeTrialPlanMock.mockResolvedValue(
      subscriptionRow({ status: "TRIALING", cycle: "MONTHLY", plan: "PRO" }),
    );

    const response = await PATCH(makePatchRequest({ plan: "PRO" }));
    const body = await response.json();

    expect(updateMembershipPreapprovalAmountMock).toHaveBeenCalledWith(
      "preap_1",
      59000,
      "ARS",
    );
    expect(changeTrialPlanMock).toHaveBeenCalledWith({
      clubId: "club_1",
      newPlan: "PRO",
    });
    expect(response.status).toBe(200);
    expect(body.subscription.plan).toBe("PRO");
  });

  // Flipped from the old Checkout-Pro-era expectation: ANNUAL trials now
  // also have a real, authorized-but-uncharged preapproval on file (same
  // mechanism as MONTHLY), so a mid-trial plan change on ANNUAL must ALSO
  // keep Mercado Pago's own amount in sync — using PLAN_DETAILS.annualPrice,
  // not monthlyPrice.
  it("updates the Mercado Pago preapproval amount (using the ANNUAL price) for a TRIALING ANNUAL subscription with an mpPreapprovalId set", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({
        status: "TRIALING",
        cycle: "ANNUAL",
        currency: "ARS",
        plan: "BASIC",
        mpPreapprovalId: "preap_annual_1",
      }),
    );
    updateMembershipPreapprovalAmountMock.mockResolvedValue({
      id: "preap_annual_1",
      status: "authorized",
    });
    changeTrialPlanMock.mockResolvedValue(
      subscriptionRow({ status: "TRIALING", cycle: "ANNUAL", plan: "PRO" }),
    );

    const response = await PATCH(makePatchRequest({ plan: "PRO" }));
    const body = await response.json();

    expect(updateMembershipPreapprovalAmountMock).toHaveBeenCalledWith(
      "preap_annual_1",
      590000,
      "ARS",
    );
    expect(changeTrialPlanMock).toHaveBeenCalledWith({
      clubId: "club_1",
      newPlan: "PRO",
    });
    expect(response.status).toBe(200);
    expect(body.subscription.plan).toBe("PRO");
  });

  it("skips the Mercado Pago amount sync (but still updates the plan locally) for the edge case of a TRIALING subscription with no mpPreapprovalId at all", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({
        status: "TRIALING",
        cycle: "ANNUAL",
        mpPreapprovalId: null,
      }),
    );
    changeTrialPlanMock.mockResolvedValue(
      subscriptionRow({ status: "TRIALING", cycle: "ANNUAL", plan: "PRO" }),
    );

    const response = await PATCH(makePatchRequest({ plan: "PRO" }));
    const body = await response.json();

    expect(updateMembershipPreapprovalAmountMock).not.toHaveBeenCalled();
    expect(changeTrialPlanMock).toHaveBeenCalledWith({
      clubId: "club_1",
      newPlan: "PRO",
    });
    expect(response.status).toBe(200);
    expect(body.subscription.plan).toBe("PRO");
  });

  it("returns 500 when the Mercado Pago amount update fails", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(
      subscriptionRow({
        status: "TRIALING",
        cycle: "MONTHLY",
        mpPreapprovalId: "preap_1",
      }),
    );
    updateMembershipPreapprovalAmountMock.mockRejectedValue(
      new Error("MP down"),
    );

    const response = await PATCH(makePatchRequest({ plan: "PRO" }));

    expect(response.status).toBe(500);
    expect(changeTrialPlanMock).not.toHaveBeenCalled();
  });
});
