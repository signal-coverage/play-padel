import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/core/billing/services/membership.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/core/billing/services/membership.service")
  >("@/core/billing/services/membership.service");
  return {
    ...actual,
    activateFreePlan: vi.fn(),
  };
});

import {
  activateFreePlan,
  ClubNotFoundError,
  RealSubscriptionExistsError,
} from "@/core/billing/services/membership.service";
import { POST } from "./route";

const activateFreePlanMock = activateFreePlan as ReturnType<typeof vi.fn>;

const ADMIN_SECRET = "fixture-admin-secret";

function makePostRequest(authHeader: string | undefined, body: unknown) {
  return new Request("https://app.example.com/api/admin/membership-free-plan", {
    method: "POST",
    headers: {
      ...(authHeader ? { authorization: authHeader } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("MEMBERSHIP_ADMIN_SECRET", ADMIN_SECRET);
  activateFreePlanMock.mockReset();
});

describe("POST /api/admin/membership-free-plan", () => {
  it("rejects requests without the correct static-secret bearer token", async () => {
    const response = await POST(
      makePostRequest("Bearer wrong-secret", { clubId: "club-1" }),
    );

    expect(response.status).toBe(401);
    expect(activateFreePlanMock).not.toHaveBeenCalled();
  });

  it("rejects requests with no authorization header at all", async () => {
    const response = await POST(
      makePostRequest(undefined, { clubId: "club-1" }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects a missing clubId with 400", async () => {
    const response = await POST(makePostRequest(`Bearer ${ADMIN_SECRET}`, {}));

    expect(response.status).toBe(400);
    expect(activateFreePlanMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON bodies with 400 instead of throwing", async () => {
    const request = new Request(
      "https://app.example.com/api/admin/membership-free-plan",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${ADMIN_SECRET}`,
          "content-type": "application/json",
        },
        body: "not json",
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 404 when the club doesn't exist", async () => {
    activateFreePlanMock.mockRejectedValue(new ClubNotFoundError("club-404"));

    const response = await POST(
      makePostRequest(`Bearer ${ADMIN_SECRET}`, { clubId: "club-404" }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: expect.any(String) });
  });

  it("returns 409 when the club already has a real Mercado Pago subscription and force was not passed", async () => {
    activateFreePlanMock.mockRejectedValue(new RealSubscriptionExistsError());

    const response = await POST(
      makePostRequest(`Bearer ${ADMIN_SECRET}`, { clubId: "club-1" }),
    );
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

    const response = await POST(
      makePostRequest(`Bearer ${ADMIN_SECRET}`, { clubId: "club-1" }),
    );
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

    await POST(
      makePostRequest(`Bearer ${ADMIN_SECRET}`, {
        clubId: "club-1",
        force: true,
      }),
    );

    expect(activateFreePlanMock).toHaveBeenCalledWith({
      clubId: "club-1",
      force: true,
    });
  });
});
