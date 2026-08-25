import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  getClubById: vi.fn(),
  updateClub: vi.fn(),
}));

vi.mock("@/core/billing/services/membership.service", () => ({
  requestPlanChange: vi.fn(),
}));

import { requireOwnerClub } from "./_lib/require-owner";
import { getClubById, updateClub } from "@/core/clubs/services/clubs.service";
import { requestPlanChange } from "@/core/billing/services/membership.service";
import { GET, PATCH } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const getClubByIdMock = getClubById as ReturnType<typeof vi.fn>;
const updateClubMock = updateClub as ReturnType<typeof vi.fn>;
const requestPlanChangeMock = requestPlanChange as ReturnType<typeof vi.fn>;

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/clubs", {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0];
}

describe("GET /api/clubs", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    getClubByIdMock.mockReset();
  });

  it("returns the auth failure response as-is when the caller is not an owner", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireOwnerClubMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET();

    expect(response).toBe(forbidden);
  });
});

describe("PATCH /api/clubs", () => {
  beforeEach(() => {
    requireOwnerClubMock.mockReset();
    updateClubMock.mockReset();
    requestPlanChangeMock.mockReset();
    requireOwnerClubMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_1", clubId: "club_1" },
    });
  });

  it("updates non-plan fields directly via updateClub, without touching requestPlanChange", async () => {
    updateClubMock.mockResolvedValue({ id: "club_1", name: "New Name" });

    const response = await PATCH(makePatchRequest({ name: "New Name" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ club: { id: "club_1", name: "New Name" } });
    expect(requestPlanChangeMock).not.toHaveBeenCalled();
    expect(updateClubMock).toHaveBeenCalledWith(
      "club_1",
      { name: "New Name" },
      "user_1",
    );
  });

  it("routes a plan change through requestPlanChange instead of writing Club.plan directly", async () => {
    requestPlanChangeMock.mockResolvedValue({
      clubId: "club_1",
      pendingPlan: "PRO",
    });
    updateClubMock.mockResolvedValue({ id: "club_1", plan: "BASIC" });

    const response = await PATCH(makePatchRequest({ plan: "PRO" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(requestPlanChangeMock).toHaveBeenCalledWith({
      clubId: "club_1",
      newPlan: "PRO",
    });
    // `plan` must never reach updateClub — the actual `Club.plan` write only
    // ever happens later, at the renewal boundary, via
    // `recordSuccessfulCharge` (no proration, see spec's "Mid-Cycle Plan
    // Change").
    expect(updateClubMock).toHaveBeenCalledWith("club_1", {}, "user_1");
    expect(json).toEqual({ club: { id: "club_1", plan: "BASIC" } });
  });

  it("returns 409 with the service's error message when requestPlanChange rejects the change, without calling updateClub", async () => {
    requestPlanChangeMock.mockRejectedValue(
      new Error(
        "Plan changes can only be requested while the membership subscription is ACTIVE",
      ),
    );

    const response = await PATCH(makePatchRequest({ plan: "PRO" }));
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json).toEqual({
      error:
        "Plan changes can only be requested while the membership subscription is ACTIVE",
    });
    expect(updateClubMock).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid input", async () => {
    const response = await PATCH(makePatchRequest({ plan: "NOT_A_PLAN" }));

    expect(response.status).toBe(400);
    expect(requestPlanChangeMock).not.toHaveBeenCalled();
    expect(updateClubMock).not.toHaveBeenCalled();
  });
});
