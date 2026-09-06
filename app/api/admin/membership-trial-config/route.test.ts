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

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: vi.fn(),
}));

import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/client";
import { updateMembershipPreapprovalPlan } from "@/lib/mercadopago/preapprovalPlans";
import { auth } from "@clerk/nextjs/server";
import { requireAdmin } from "@/lib/auth/admin";
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
const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const requireAdminMock = requireAdmin as ReturnType<typeof vi.fn>;

function makePatchRequest(body: unknown) {
  return new Request(
    "https://app.example.com/api/admin/membership-trial-config",
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

beforeEach(() => {
  findManyMock.mockReset();
  upsertMock.mockReset();
  cacheFindManyMock.mockReset();
  cacheFindManyMock.mockResolvedValue([]);
  updateMembershipPreapprovalPlanMock.mockReset();
  authMock.mockReset();
  requireAdminMock.mockReset();
  authMock.mockResolvedValue({ userId: "user_admin" });
  requireAdminMock.mockResolvedValue(null);
});

describe("GET /api/admin/membership-trial-config", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const response = await GET();

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns 403 when signed in but not an admin", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns all configured trial overrides when authorized as admin", async () => {
    findManyMock.mockResolvedValue([{ plan: "BASIC", trialDays: 30 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.configs).toEqual([{ plan: "BASIC", trialDays: 30 }]);
  });
});

describe("PATCH /api/admin/membership-trial-config", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const response = await PATCH(
      makePatchRequest({
        plan: "BASIC",
        trialDays: 30,
      }),
    );

    expect(response.status).toBe(401);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns 403 when signed in but not an admin", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const response = await PATCH(
      makePatchRequest({
        plan: "BASIC",
        trialDays: 30,
      }),
    );

    expect(response.status).toBe(403);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("upserts MembershipTrialConfig.trialDays for the given plan", async () => {
    upsertMock.mockResolvedValue({ plan: "PRO", trialDays: 14 });

    const response = await PATCH(
      makePatchRequest({
        plan: "PRO",
        trialDays: 14,
      }),
    );
    const body = await response.json();

    expect(upsertMock).toHaveBeenCalledWith({
      where: { plan: "PRO" },
      create: { plan: "PRO", trialDays: 14, updatedBy: "user_admin" },
      update: { trialDays: 14, updatedBy: "user_admin" },
    });
    expect(response.status).toBe(200);
    expect(body.config).toEqual({ plan: "PRO", trialDays: 14 });
  });

  it("derives updatedBy from the authenticated admin's own userId, ignoring any updatedBy the client sends in the body", async () => {
    upsertMock.mockResolvedValue({ plan: "PRO", trialDays: 14 });

    await PATCH(
      makePatchRequest({
        plan: "PRO",
        trialDays: 14,
        // A malicious/careless client trying to spoof a different actor —
        // must be ignored entirely in favor of the real session's userId.
        updatedBy: "someone_else",
      }),
    );

    expect(upsertMock).toHaveBeenCalledWith({
      where: { plan: "PRO" },
      create: { plan: "PRO", trialDays: 14, updatedBy: "user_admin" },
      update: { trialDays: 14, updatedBy: "user_admin" },
    });
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
      makePatchRequest({
        plan: "PRO",
        trialDays: 21,
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
      makePatchRequest({
        plan: "BASIC",
        trialDays: 7,
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
      makePatchRequest({
        plan: "PRO",
        trialDays: 10,
      }),
    );

    expect(updateMembershipPreapprovalPlanMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });

  it("rejects an invalid plan tier with 400", async () => {
    const response = await PATCH(
      makePatchRequest({
        plan: "ENTERPRISE",
        trialDays: 14,
      }),
    );

    expect(response.status).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("rejects a negative trialDays with 400", async () => {
    const response = await PATCH(
      makePatchRequest({
        plan: "BASIC",
        trialDays: -5,
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
          "content-type": "application/json",
        },
        body: "not json",
      },
    );

    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });
});
