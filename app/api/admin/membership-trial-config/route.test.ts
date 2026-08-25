import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    membershipTrialConfig: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/db/client";
import { GET, PATCH } from "./route";

const findManyMock = prisma.membershipTrialConfig.findMany as ReturnType<
  typeof vi.fn
>;
const upsertMock = prisma.membershipTrialConfig.upsert as ReturnType<
  typeof vi.fn
>;

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
    findManyMock.mockResolvedValue([
      { plan: "BASIC", trialDays: 30, mpPreapprovalPlanId: "plan_1" },
    ]);

    const response = await GET(makeGetRequest("Bearer test-admin-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.configs).toEqual([
      { plan: "BASIC", trialDays: 30, mpPreapprovalPlanId: "plan_1" },
    ]);
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

  it("upserts MembershipTrialConfig.trialDays and mpPreapprovalPlanId for the given plan", async () => {
    upsertMock.mockResolvedValue({
      plan: "PRO",
      trialDays: 14,
      mpPreapprovalPlanId: "plan_pro_1",
    });

    const response = await PATCH(
      makePatchRequest("Bearer test-admin-secret", {
        plan: "PRO",
        trialDays: 14,
        mpPreapprovalPlanId: "plan_pro_1",
        updatedBy: "admin@example.com",
      }),
    );
    const body = await response.json();

    expect(upsertMock).toHaveBeenCalledWith({
      where: { plan: "PRO" },
      create: {
        plan: "PRO",
        trialDays: 14,
        mpPreapprovalPlanId: "plan_pro_1",
        updatedBy: "admin@example.com",
      },
      update: {
        trialDays: 14,
        mpPreapprovalPlanId: "plan_pro_1",
        updatedBy: "admin@example.com",
      },
    });
    expect(response.status).toBe(200);
    expect(body.config).toEqual({
      plan: "PRO",
      trialDays: 14,
      mpPreapprovalPlanId: "plan_pro_1",
    });
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
