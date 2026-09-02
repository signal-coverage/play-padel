import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildPreapprovalPlanResponse } from "./membershipFixtures";

const createMock = vi.fn();
const updateMock = vi.fn();

vi.mock("mercadopago", () => ({
  PreApprovalPlan: vi.fn().mockImplementation(function (config: unknown) {
    return { config, create: createMock, update: updateMock };
  }),
}));

vi.mock("./platformClient", () => ({
  getPlatformMercadoPagoClient: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    membershipTrialConfig: {
      findUnique: vi.fn(),
    },
    membershipPreapprovalPlanCache: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { PreApprovalPlan } from "mercadopago";
import { getPlatformMercadoPagoClient } from "./platformClient";
import { prisma } from "@/infrastructure/db/client";
import {
  createMembershipPreapprovalPlan,
  getOrCreateMembershipPreapprovalPlanId,
  resolveFreeTrialConfig,
} from "./preapprovalPlans";

const getPlatformMercadoPagoClientMock =
  getPlatformMercadoPagoClient as ReturnType<typeof vi.fn>;
const findUniqueMock = prisma.membershipTrialConfig.findUnique as ReturnType<
  typeof vi.fn
>;
const cacheFindUniqueMock = prisma.membershipPreapprovalPlanCache
  .findUnique as ReturnType<typeof vi.fn>;
const cacheCreateMock = prisma.membershipPreapprovalPlanCache
  .create as ReturnType<typeof vi.fn>;

const FAKE_PLATFORM_CLIENT = { accessToken: "platform-token" };

beforeEach(() => {
  createMock.mockReset();
  updateMock.mockReset();
  getPlatformMercadoPagoClientMock.mockReset();
  findUniqueMock.mockReset();
  cacheFindUniqueMock.mockReset();
  cacheCreateMock.mockReset();
  getPlatformMercadoPagoClientMock.mockReturnValue(FAKE_PLATFORM_CLIENT);
  createMock.mockResolvedValue(buildPreapprovalPlanResponse());
});

describe("resolveFreeTrialConfig (pure)", () => {
  it("prefers the admin trial-config override (days) over the static per-plan default", () => {
    expect(resolveFreeTrialConfig(14, 3)).toEqual({
      frequency: 14,
      frequency_type: "days",
    });
  });

  it("falls back to the static welcomeFreeMonths default (months) when no override exists", () => {
    expect(resolveFreeTrialConfig(null, 3)).toEqual({
      frequency: 3,
      frequency_type: "months",
    });
  });

  it("returns undefined when neither an override nor a static default exists", () => {
    expect(resolveFreeTrialConfig(null, null)).toBeUndefined();
  });
});

describe("createMembershipPreapprovalPlan", () => {
  it("uses the platform-scoped Mercado Pago client, not a club-scoped one", async () => {
    findUniqueMock.mockResolvedValue(null);

    await createMembershipPreapprovalPlan({
      plan: "PRO",
      currency: "ARS",
      backUrl: "https://app.example.com/dashboard",
    });

    expect(getPlatformMercadoPagoClientMock).toHaveBeenCalledWith();
    expect(PreApprovalPlan).toHaveBeenCalledWith(FAKE_PLATFORM_CLIENT);
  });

  it("sets auto_recurring.free_trial from the admin MembershipTrialConfig override when one exists", async () => {
    findUniqueMock.mockResolvedValue({
      plan: "PRO",
      trialDays: 21,
      mpPreapprovalPlanId: null,
    });

    await createMembershipPreapprovalPlan({
      plan: "PRO",
      currency: "ARS",
      backUrl: "https://app.example.com/dashboard",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.auto_recurring.free_trial).toEqual({
      frequency: 21,
      frequency_type: "days",
    });
  });

  it("falls back to PLAN_DETAILS.welcomeFreeMonths when no override row exists for the plan", async () => {
    findUniqueMock.mockResolvedValue(null);

    await createMembershipPreapprovalPlan({
      plan: "PRO",
      currency: "ARS",
      backUrl: "https://app.example.com/dashboard",
    });

    const callArgs = createMock.mock.calls[0][0];
    // PRO's static welcomeFreeMonths is 3 (lib/consts/planPricing.ts)
    expect(callArgs.body.auto_recurring.free_trial).toEqual({
      frequency: 3,
      frequency_type: "months",
    });
  });

  it("threads currency as an explicit parameter, never a hardcoded literal", async () => {
    findUniqueMock.mockResolvedValue(null);

    await createMembershipPreapprovalPlan({
      plan: "BASIC",
      currency: "USD",
      backUrl: "https://app.example.com/dashboard",
    });

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs.body.auto_recurring.currency_id).toBe("USD");
  });

  it("returns the created plan's id and init_point", async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue(
      buildPreapprovalPlanResponse({ id: "plan_custom_1" }),
    );

    const result = await createMembershipPreapprovalPlan({
      plan: "PRO",
      currency: "ARS",
      backUrl: "https://app.example.com/dashboard",
    });

    expect(result.id).toBe("plan_custom_1");
  });

  it("throws when Mercado Pago does not return a plan id", async () => {
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      ...buildPreapprovalPlanResponse(),
      id: undefined,
    });

    await expect(
      createMembershipPreapprovalPlan({
        plan: "PRO",
        currency: "ARS",
        backUrl: "https://app.example.com/dashboard",
      }),
    ).rejects.toThrow("Mercado Pago did not return a preapproval_plan id");
  });

  it("throws for MAX (no fixed monthly price to build a plan from)", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      createMembershipPreapprovalPlan({
        plan: "MAX",
        currency: "ARS",
        backUrl: "https://app.example.com/dashboard",
      }),
    ).rejects.toThrow(/MAX/);
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("getOrCreateMembershipPreapprovalPlanId", () => {
  beforeEach(() => {
    findUniqueMock.mockResolvedValue(null);
  });

  it("reuses the cached preapproval_plan id for a (plan, currency) pair without calling Mercado Pago", async () => {
    cacheFindUniqueMock.mockResolvedValue({
      plan: "PRO",
      currency: "ARS",
      preapprovalPlanId: "plan_cached_1",
    });

    const result = await getOrCreateMembershipPreapprovalPlanId({
      plan: "PRO",
      currency: "ARS",
      backUrl: "https://app.example.com/dashboard",
    });

    expect(cacheFindUniqueMock).toHaveBeenCalledWith({
      where: { plan_currency: { plan: "PRO", currency: "ARS" } },
    });
    expect(result).toEqual({ id: "plan_cached_1" });
    expect(createMock).not.toHaveBeenCalled();
    expect(cacheCreateMock).not.toHaveBeenCalled();
  });

  it("creates and persists a new preapproval_plan id on a cache miss", async () => {
    cacheFindUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue(
      buildPreapprovalPlanResponse({ id: "plan_new_1" }),
    );
    cacheCreateMock.mockResolvedValue({
      plan: "PRO",
      currency: "ARS",
      preapprovalPlanId: "plan_new_1",
    });

    const result = await getOrCreateMembershipPreapprovalPlanId({
      plan: "PRO",
      currency: "ARS",
      backUrl: "https://app.example.com/dashboard",
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(cacheCreateMock).toHaveBeenCalledWith({
      data: { plan: "PRO", currency: "ARS", preapprovalPlanId: "plan_new_1" },
    });
    expect(result.id).toBe("plan_new_1");
  });

  it("caches per (plan, currency) — a different currency for the same tier is a cache miss", async () => {
    cacheFindUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue(
      buildPreapprovalPlanResponse({ id: "plan_usd_1" }),
    );
    cacheCreateMock.mockResolvedValue({});

    await getOrCreateMembershipPreapprovalPlanId({
      plan: "PRO",
      currency: "USD",
      backUrl: "https://app.example.com/dashboard",
    });

    expect(cacheFindUniqueMock).toHaveBeenCalledWith({
      where: { plan_currency: { plan: "PRO", currency: "USD" } },
    });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("on a race (unique constraint violation on the cache insert), re-reads and reuses the winner's cached id instead of throwing", async () => {
    cacheFindUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      plan: "PRO",
      currency: "ARS",
      preapprovalPlanId: "plan_winner_1",
    });
    createMock.mockResolvedValue(
      buildPreapprovalPlanResponse({ id: "plan_loser_1" }),
    );
    const raceError = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
    });
    cacheCreateMock.mockRejectedValue(raceError);

    const result = await getOrCreateMembershipPreapprovalPlanId({
      plan: "PRO",
      currency: "ARS",
      backUrl: "https://app.example.com/dashboard",
    });

    expect(result.id).toBe("plan_winner_1");
    expect(cacheFindUniqueMock).toHaveBeenCalledTimes(2);
  });

  it("re-throws non-race errors from the cache write instead of swallowing them", async () => {
    cacheFindUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue(
      buildPreapprovalPlanResponse({ id: "plan_x" }),
    );
    cacheCreateMock.mockRejectedValue(new Error("DB down"));

    await expect(
      getOrCreateMembershipPreapprovalPlanId({
        plan: "PRO",
        currency: "ARS",
        backUrl: "https://app.example.com/dashboard",
      }),
    ).rejects.toThrow("DB down");
  });
});
