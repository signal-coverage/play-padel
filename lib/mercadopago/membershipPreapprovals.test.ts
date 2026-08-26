import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildPreapprovalResponse,
  buildPausedPreapprovalResponse,
  buildReactivatedPreapprovalResponse,
} from "./membershipFixtures";

const createMock = vi.fn();
const updateMock = vi.fn();
const getMock = vi.fn();

vi.mock("mercadopago", () => ({
  PreApproval: vi.fn().mockImplementation(function (config: unknown) {
    return { config, create: createMock, update: updateMock, get: getMock };
  }),
}));

vi.mock("./platformClient", () => ({
  getPlatformMercadoPagoClient: vi.fn(),
}));

import { PreApproval } from "mercadopago";
import { getPlatformMercadoPagoClient } from "./platformClient";
import {
  createMembershipPreapproval,
  pauseMembershipPreapproval,
  reactivateMembershipPreapproval,
  getMembershipPreapproval,
} from "./membershipPreapprovals";

const getPlatformMercadoPagoClientMock =
  getPlatformMercadoPagoClient as ReturnType<typeof vi.fn>;

const FAKE_PLATFORM_CLIENT = { accessToken: "platform-token" };

beforeEach(() => {
  createMock.mockReset();
  updateMock.mockReset();
  getMock.mockReset();
  getPlatformMercadoPagoClientMock.mockReset();
  getPlatformMercadoPagoClientMock.mockReturnValue(FAKE_PLATFORM_CLIENT);
});

describe("createMembershipPreapproval", () => {
  beforeEach(() => {
    createMock.mockResolvedValue(buildPreapprovalResponse());
  });

  it("uses the platform-scoped Mercado Pago client, not a club-scoped one", async () => {
    await createMembershipPreapproval({
      clubId: "club_1",
      preapprovalPlanId: "plan_1",
      payerEmail: "owner@example.com",
      cardTokenId: "card_tok_1",
      currency: "ARS",
      transactionAmount: 30000,
      backUrl: "https://app.example.com/dashboard",
    });

    expect(getPlatformMercadoPagoClientMock).toHaveBeenCalledWith();
    expect(PreApproval).toHaveBeenCalledWith(FAKE_PLATFORM_CLIENT);
  });

  it("requests status: authorized, never a pending/unauthorized preapproval — no trial without an authorized payment method", async () => {
    await createMembershipPreapproval({
      clubId: "club_1",
      preapprovalPlanId: "plan_1",
      payerEmail: "owner@example.com",
      cardTokenId: "card_tok_1",
      currency: "ARS",
      transactionAmount: 30000,
      backUrl: "https://app.example.com/dashboard",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.status).toBe("authorized");
    expect(callArgs.body.card_token_id).toBe("card_tok_1");
  });

  it("references the given preapproval_plan_id and clubId as external_reference", async () => {
    await createMembershipPreapproval({
      clubId: "club_42",
      preapprovalPlanId: "plan_99",
      payerEmail: "owner@example.com",
      cardTokenId: "card_tok_1",
      currency: "ARS",
      transactionAmount: 30000,
      backUrl: "https://app.example.com/dashboard",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.preapproval_plan_id).toBe("plan_99");
    expect(callArgs.body.external_reference).toBe("club_42");
  });

  it("threads currency as an explicit parameter, never a hardcoded literal", async () => {
    await createMembershipPreapproval({
      clubId: "club_1",
      preapprovalPlanId: "plan_1",
      payerEmail: "owner@example.com",
      cardTokenId: "card_tok_1",
      currency: "USD",
      transactionAmount: 30000,
      backUrl: "https://app.example.com/dashboard",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.auto_recurring.currency_id).toBe("USD");
  });

  // Confirmed via a real Mercado Pago sandbox call during smoke testing:
  // creating a preapproval linked to a preapproval_plan_id WITHOUT
  // `auto_recurring.transaction_amount` is rejected with "The
  // transaction_amount must be the same as preapproval_plan" — MP's own
  // docs example for "Subscription with an associated plan" always includes
  // it alongside frequency/currency_id, even though the plan already
  // carries a transaction_amount.
  it("sends transaction_amount in auto_recurring, matching the preapproval_plan's own amount", async () => {
    await createMembershipPreapproval({
      clubId: "club_1",
      preapprovalPlanId: "plan_1",
      payerEmail: "owner@example.com",
      cardTokenId: "card_tok_1",
      currency: "ARS",
      transactionAmount: 30000,
      backUrl: "https://app.example.com/dashboard",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.auto_recurring.transaction_amount).toBe(30000);
  });

  it("returns the created preapproval's id and status", async () => {
    createMock.mockResolvedValue(
      buildPreapprovalResponse({ id: "preap_custom", status: "authorized" }),
    );

    const result = await createMembershipPreapproval({
      clubId: "club_1",
      preapprovalPlanId: "plan_1",
      payerEmail: "owner@example.com",
      cardTokenId: "card_tok_1",
      currency: "ARS",
      transactionAmount: 30000,
      backUrl: "https://app.example.com/dashboard",
    });

    expect(result).toEqual({
      id: "preap_custom",
      status: "authorized",
      initPoint: undefined,
    });
  });

  it("throws when Mercado Pago does not return an id/status", async () => {
    createMock.mockResolvedValue({
      ...buildPreapprovalResponse(),
      id: undefined,
    });

    await expect(
      createMembershipPreapproval({
        clubId: "club_1",
        preapprovalPlanId: "plan_1",
        payerEmail: "owner@example.com",
        cardTokenId: "card_tok_1",
        currency: "ARS",
        transactionAmount: 30000,
        backUrl: "https://app.example.com/dashboard",
      }),
    ).rejects.toThrow("Mercado Pago did not return a preapproval id/status");
  });
});

describe("pauseMembershipPreapproval", () => {
  it("PUTs status: paused for the given preapproval id", async () => {
    updateMock.mockResolvedValue(buildPausedPreapprovalResponse());

    const result = await pauseMembershipPreapproval(
      "preap_2c9380848d1e6d1b018d1ea9e2a70099",
    );

    expect(updateMock).toHaveBeenCalledWith({
      id: "preap_2c9380848d1e6d1b018d1ea9e2a70099",
      body: { status: "paused" },
    });
    expect(result.status).toBe("paused");
  });

  it("throws when Mercado Pago does not confirm the pause", async () => {
    updateMock.mockResolvedValue({});

    await expect(pauseMembershipPreapproval("preap_x")).rejects.toThrow(
      /pausing/,
    );
  });
});

describe("reactivateMembershipPreapproval", () => {
  it("PUTs status: authorized with a bounded end date for exactly one more cycle", async () => {
    updateMock.mockResolvedValue(
      buildReactivatedPreapprovalResponse({
        endDate: "2026-10-24T12:00:00.000-04:00",
      }),
    );

    const result = await reactivateMembershipPreapproval({
      preapprovalId: "preap_1",
      cycleEndDate: "2026-10-24T12:00:00.000-04:00",
    });

    expect(updateMock).toHaveBeenCalledWith({
      id: "preap_1",
      body: {
        status: "authorized",
        auto_recurring: { end_date: "2026-10-24T12:00:00.000-04:00" },
      },
    });
    expect(result.status).toBe("authorized");
  });

  it("throws when Mercado Pago does not confirm reactivation", async () => {
    updateMock.mockResolvedValue({});

    await expect(
      reactivateMembershipPreapproval({
        preapprovalId: "preap_1",
        cycleEndDate: "2026-10-24T12:00:00.000-04:00",
      }),
    ).rejects.toThrow(/reactivat/);
  });
});

describe("getMembershipPreapproval", () => {
  it("GETs the preapproval by id using the platform-scoped client", async () => {
    getMock.mockResolvedValue(
      buildPreapprovalResponse({ status: "authorized" }),
    );

    const result = await getMembershipPreapproval(
      "preap_2c9380848d1e6d1b018d1ea9e2a70099",
    );

    expect(getPlatformMercadoPagoClientMock).toHaveBeenCalledWith();
    expect(PreApproval).toHaveBeenCalledWith(FAKE_PLATFORM_CLIENT);
    expect(getMock).toHaveBeenCalledWith({
      id: "preap_2c9380848d1e6d1b018d1ea9e2a70099",
    });
    expect(result).toEqual({
      id: "preap_2c9380848d1e6d1b018d1ea9e2a70099",
      status: "authorized",
      summarized: null,
    });
  });

  it("reflects a MP-side cancellation so the cron backstop can reconcile a missed webhook", async () => {
    getMock.mockResolvedValue(buildPreapprovalResponse({ status: "canceled" }));

    const result = await getMembershipPreapproval("preap_1");

    expect(result.status).toBe("canceled");
  });

  it("throws when Mercado Pago does not return an id/status", async () => {
    getMock.mockResolvedValue({});

    await expect(getMembershipPreapproval("preap_1")).rejects.toThrow(
      "Mercado Pago did not return a preapproval id/status",
    );
  });

  // The membership webhook handler (Phase 4) must tell a routine successful
  // charge apart from a failed/recycling one, but `status` alone stays
  // "authorized" throughout MP's own dunning retries — only `summarized`
  // (charge history + health semaphore) distinguishes them. See
  // membershipFixtures.ts's PreapprovalSummarizedOverrides doc comment.
  it("surfaces the summarized charge-history/health fields the webhook handler needs to distinguish a successful charge from a failed/recycling one", async () => {
    getMock.mockResolvedValue(
      buildPreapprovalResponse({
        status: "authorized",
        summarized: {
          chargedQuantity: 3,
          pendingChargeQuantity: 0,
          lastChargedDate: "2026-08-24T12:00:00.000-04:00",
          semaphore: "green",
        },
      }),
    );

    const result = await getMembershipPreapproval("preap_1");

    expect(result.summarized).toEqual({
      chargedQuantity: 3,
      pendingChargeQuantity: 0,
      lastChargedDate: "2026-08-24T12:00:00.000-04:00",
      semaphore: "green",
    });
  });

  it("surfaces a non-zero pendingChargeQuantity / red semaphore for a preapproval stuck in MP's own recycling retry", async () => {
    getMock.mockResolvedValue(
      buildPreapprovalResponse({
        status: "authorized",
        summarized: {
          chargedQuantity: 2,
          pendingChargeQuantity: 1,
          lastChargedDate: "2026-07-24T12:00:00.000-04:00",
          semaphore: "red",
        },
      }),
    );

    const result = await getMembershipPreapproval("preap_1");

    expect(result.summarized).toEqual({
      chargedQuantity: 2,
      pendingChargeQuantity: 1,
      lastChargedDate: "2026-07-24T12:00:00.000-04:00",
      semaphore: "red",
    });
  });

  it("defaults summarized to null when Mercado Pago omits it", async () => {
    getMock.mockResolvedValue(
      buildPreapprovalResponse({ status: "authorized" }),
    );

    const result = await getMembershipPreapproval("preap_1");

    expect(result.summarized).toBeNull();
  });
});
