import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    membershipTrialConfig: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    membershipPreapprovalPlanCache: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/mercadopago/preapprovalPlans", () => ({
  updateMembershipPreapprovalPlan: vi.fn(),
}));

import { prisma } from "@/infrastructure/db/client";
import { updateMembershipPreapprovalPlan } from "@/lib/mercadopago/preapprovalPlans";
import { GET, PATCH } from "./route";

const findManyMock = prisma.membershipTrialConfig.findMany as ReturnType<
  typeof vi.fn
>;
const upsertMock = prisma.membershipTrialConfig.upsert as ReturnType<
  typeof vi.fn
>;
const cacheFindManyMock = prisma.membershipPreapprovalPlanCache
  .findMany as ReturnType<typeof vi.fn>;
const updateMembershipPreapprovalPlanMock =
  updateMembershipPreapprovalPlan as ReturnType<typeof vi.fn>;

function makeGetRequest(authHeader?: string) {
  return new Request(
    "https://app.example.com/api/admin/membership-trial-config",
    { headers: authHeader ? { authorization: authHeader } : {} },
  );
}

function makePatchRequest(authHeader: string | undefined, body: unknown) {
  return new Request(
    "https://app.example.com/api/admin/membership-trial-config",
    {
      method: "PATCH",
      headers: {
        ...(authHeader ? { authorization: authHeader } : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

beforeEach(() => {
  vi.stubEnv("MEMBERSHIP_ADMIN_SECRET", "test-admin-secret");
  findManyMock.mockReset();
  upsertMock.mockReset();
  cacheFindManyMock.mockReset();
  cacheFindManyMock.mockResolvedValue([]);
  updateMembershipPreapprovalPlanMock.mockReset();
});

describe("GET /api/admin/membership-trial-config", () => {
  it("rejects requests without the correct static-secret bearer token", async () => {
    const response = await GET(makeGetRequest("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("rejects requests with no authorization header at all", async () => {
    const response = await GET(makeGetRequest());

    expect(response.status).toBe(401);
  });

  it("returns all configured trial overrides when authorized", async () => {
    findManyMock.mockResolvedValue([{ plan: "BASIC", trialDays: 30 }]);

    const response = await GET(makeGetRequest("Bearer test-admin-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.configs).toEqual([{ plan: "BASIC", trialDays: 30 }]);
  });
});

describe("PATCH /api/admin/membership-trial-config", () => {
  it("rejects requests without the correct static-secret bearer token", async () => {
    const response = await PATCH(
      makePatchRequest("Bearer wrong-secret", {
        plan: "BASIC",
        trialDays: 30,
        updatedBy: "admin@example.com",
      }),
    );

    expect(response.status).toBe(401);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("upserts MembershipTrialConfig.trialDays for the given plan", async () => {
    upsertMock.mockResolvedValue({ plan: "PRO", trialDays: 14 });

    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        plan: "PRO",
        trialDays: 14,
        updatedBy: "admin@example.com",
      }),
    );
    const body = await response.json();

    expect(upsertMock).toHaveBeenCalledWith({
      where: { plan: "PRO" },
      create: { plan: "PRO", trialDays: 14, updatedBy: "admin@example.com" },
      update: { trialDays: 14, updatedBy: "admin@example.com" },
    });
    expect(response.status).toBe(200);
    expect(body.config).toEqual({ plan: "PRO", trialDays: 14 });
  });

  it("propagates the new trialDays to every cached preapproval_plan for that tier via updateMembershipPreapprovalPlan", async () => {
    upsertMock.mockResolvedValue({ plan: "PRO", trialDays: 21 });
    cacheFindManyMock.mockResolvedValue([
      { plan: "PRO", currency: "ARS", preapprovalPlanId: "plan_pro_ars" },
      { plan: "PRO", currency: "USD", preapprovalPlanId: "plan_pro_usd" },
    ]);
    updateMembershipPreapprovalPlanMock.mockResolvedValue({
      id: "plan_pro_ars",
    });

    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        plan: "PRO",
        trialDays: 21,
        updatedBy: "admin@example.com",
      }),
    );

    expect(cacheFindManyMock).toHaveBeenCalledWith({
      where: { plan: "PRO" },
    });
    expect(updateMembershipPreapprovalPlanMock).toHaveBeenCalledWith({
      preapprovalPlanId: "plan_pro_ars",
      plan: "PRO",
      currency: "ARS",
    });
    expect(updateMembershipPreapprovalPlanMock).toHaveBeenCalledWith({
      preapprovalPlanId: "plan_pro_usd",
      plan: "PRO",
      currency: "USD",
    });
    expect(updateMembershipPreapprovalPlanMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });

  it("no-ops cleanly (never calls updateMembershipPreapprovalPlan) when no cached preapproval_plan exists yet for that tier", async () => {
    upsertMock.mockResolvedValue({ plan: "BASIC", trialDays: 7 });
    cacheFindManyMock.mockResolvedValue([]);

    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        plan: "BASIC",
        trialDays: 7,
        updatedBy: "admin@example.com",
      }),
    );

    expect(updateMembershipPreapprovalPlanMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("still returns 200 and continues propagating to other currencies when one cached plan's Mercado Pago update fails", async () => {
    upsertMock.mockResolvedValue({ plan: "PRO", trialDays: 10 });
    cacheFindManyMock.mockResolvedValue([
      { plan: "PRO", currency: "ARS", preapprovalPlanId: "plan_pro_ars" },
      { plan: "PRO", currency: "USD", preapprovalPlanId: "plan_pro_usd" },
    ]);
    updateMembershipPreapprovalPlanMock.mockImplementation(
      async ({ currency }: { currency: string }) => {
        if (currency === "ARS") throw new Error("MP down");
        return { id: "plan_pro_usd" };
      },
    );

    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        plan: "PRO",
        trialDays: 10,
        updatedBy: "admin@example.com",
      }),
    );

    expect(updateMembershipPreapprovalPlanMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });

  it("rejects an invalid plan tier with 400", async () => {
    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        plan: "ENTERPRISE",
        trialDays: 14,
        updatedBy: "admin@example.com",
      }),
    );

    expect(response.status).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("rejects a negative trialDays with 400", async () => {
    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        plan: "BASIC",
        trialDays: -5,
        updatedBy: "admin@example.com",
      }),
    );

    expect(response.status).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("rejects a missing updatedBy with 400 — no admin-role auth exists to derive it from", async () => {
    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        plan: "BASIC",
        trialDays: 14,
      }),
    );

    expect(response.status).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON bodies with 400 instead of throwing", async () => {
    const request = new Request(
      "https://app.example.com/api/admin/membership-trial-config",
      {
        method: "PATCH",
        headers: {
          authorization: "Bearer test-admin-secret",
          "content-type": "application/json",
        },
        body: "not json",
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });
});
