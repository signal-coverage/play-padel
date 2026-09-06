import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.importActual below executes the real membership.service module (only
// activateFreePlan is overridden), which transitively imports the real
// infrastructure/db/client.ts — mock it so that module-load-time
// DATABASE_URL validation never runs against this test's (unset) env.
vi.mock("@/infrastructure/db/client", () => ({
  prisma: {},
}));

vi.mock("@/core/billing/services/membership.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/core/billing/services/membership.service")
  >("@/core/billing/services/membership.service");
  return {
    ...actual,
    activateFreePlan: vi.fn(),
  };
});

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: vi.fn(),
}));

import { NextResponse } from "next/server";
import {
  activateFreePlan,
  ClubNotFoundError,
  RealSubscriptionExistsError,
} from "@/core/billing/services/membership.service";
import { requireAdmin } from "@/lib/auth/admin";
import { POST } from "./route";

const activateFreePlanMock = activateFreePlan as ReturnType<typeof vi.fn>;
const requireAdminMock = requireAdmin as ReturnType<typeof vi.fn>;

function makePostRequest(body: unknown) {
  return new Request("https://app.example.com/api/admin/membership-free-plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  activateFreePlanMock.mockReset();
  requireAdminMock.mockReset();
  requireAdminMock.mockResolvedValue(null);
});

describe("POST /api/admin/membership-free-plan", () => {
  it("returns 401 when there is no signed-in Clerk user", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );

    const response = await POST(makePostRequest({ clubId: "club-1" }));

    expect(response.status).toBe(401);
    expect(activateFreePlanMock).not.toHaveBeenCalled();
  });

  it("returns 403 when signed in but not an admin", async () => {
    requireAdminMock.mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    );

    const response = await POST(makePostRequest({ clubId: "club-1" }));

    expect(response.status).toBe(403);
    expect(activateFreePlanMock).not.toHaveBeenCalled();
  });

  it("rejects a missing clubId with 400", async () => {
    const response = await POST(makePostRequest({}));

    expect(response.status).toBe(400);
    expect(activateFreePlanMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON bodies with 400 instead of throwing", async () => {
    const request = new Request(
      "https://app.example.com/api/admin/membership-free-plan",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 404 when the club doesn't exist", async () => {
    activateFreePlanMock.mockRejectedValue(new ClubNotFoundError("club-404"));

    const response = await POST(makePostRequest({ clubId: "club-404" }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: expect.any(String) });
  });

  it("returns 409 when the club already has a real Mercado Pago subscription and force was not passed", async () => {
    activateFreePlanMock.mockRejectedValue(new RealSubscriptionExistsError());

    const response = await POST(makePostRequest({ clubId: "club-1" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: expect.any(String) });
  });

  it("returns 200 with the subscription snapshot on success", async () => {
    const subscription = {
      id: "sub_1",
      clubId: "club-1",
      plan: "FREE",
      status: "ACTIVE",
    };
    activateFreePlanMock.mockResolvedValue(subscription);

    const response = await POST(makePostRequest({ clubId: "club-1" }));
    const body = await response.json();

    expect(activateFreePlanMock).toHaveBeenCalledWith({
      clubId: "club-1",
      force: undefined,
    });
    expect(response.status).toBe(200);
    expect(body).toEqual({ subscription });
  });

  it("passes force through to activateFreePlan when provided", async () => {
    activateFreePlanMock.mockResolvedValue({ id: "sub_1" });

    await POST(makePostRequest({ clubId: "club-1", force: true }));

    expect(activateFreePlanMock).toHaveBeenCalledWith({
      clubId: "club-1",
      force: true,
    });
  });
});
