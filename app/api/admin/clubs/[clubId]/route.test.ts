import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/adminProfile", () => ({
  requireAdminProfile: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  getClubById: vi.fn(),
  updateClub: vi.fn(),
  getClubOwner: vi.fn(),
}));

vi.mock("@/core/billing/services/membership.service", () => ({
  requestPlanChange: vi.fn(),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn(),
}));

import { requireAdminProfile } from "@/lib/auth/adminProfile";
import {
  getClubById,
  updateClub,
  getClubOwner,
} from "@/core/clubs/services/clubs.service";
import { requestPlanChange } from "@/core/billing/services/membership.service";
import { dispatch } from "@/lib/notifications/dispatcher";
import { GET, PATCH } from "./route";

const requireAdminMock = requireAdminProfile as ReturnType<typeof vi.fn>;
const getClubByIdMock = getClubById as ReturnType<typeof vi.fn>;
const updateClubMock = updateClub as ReturnType<typeof vi.fn>;
const getClubOwnerMock = getClubOwner as ReturnType<typeof vi.fn>;
const requestPlanChangeMock = requestPlanChange as ReturnType<typeof vi.fn>;
const dispatchMock = dispatch as ReturnType<typeof vi.fn>;

function makeParams(clubId = "club_1") {
  return { params: Promise.resolve({ clubId }) };
}

function makePatchRequest(body: unknown) {
  return new Request("http://localhost/api/admin/clubs/club_1", {
    method: "PATCH",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0];
}

describe("GET /api/admin/clubs/[clubId]", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getClubByIdMock.mockReset();
    getClubOwnerMock.mockReset();
    getClubOwnerMock.mockResolvedValue(null);
  });

  it("returns the auth failure response as-is when the caller is not an admin", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireAdminMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/clubs/club_1",
      ) as unknown as Parameters<typeof GET>[0],
      makeParams(),
    );

    expect(response).toBe(forbidden);
    expect(getClubByIdMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the clubId does not match any club", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin" },
    });
    getClubByIdMock.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost/api/admin/clubs/club_unknown",
      ) as unknown as Parameters<typeof GET>[0],
      makeParams("club_unknown"),
    );

    expect(response.status).toBe(404);
  });

  it("returns the requested club when found, with owner null when the club has no owner row", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin" },
    });
    getClubByIdMock.mockResolvedValue({
      id: "club_1",
      name: "Club Padel Norte",
    });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/clubs/club_1",
      ) as unknown as Parameters<typeof GET>[0],
      makeParams(),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      club: { id: "club_1", name: "Club Padel Norte" },
      owner: null,
    });
    expect(getClubByIdMock).toHaveBeenCalledWith("club_1");
    expect(getClubOwnerMock).toHaveBeenCalledWith("club_1");
  });

  it("includes the owner's id and displayName when the club has an owner", async () => {
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin" },
    });
    getClubByIdMock.mockResolvedValue({
      id: "club_1",
      name: "Club Padel Norte",
    });
    getClubOwnerMock.mockResolvedValue({
      id: "user_owner",
      displayName: "Owner Person",
    });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/clubs/club_1",
      ) as unknown as Parameters<typeof GET>[0],
      makeParams(),
    );
    const json = await response.json();

    expect(json.owner).toEqual({
      id: "user_owner",
      displayName: "Owner Person",
    });
  });
});

describe("PATCH /api/admin/clubs/[clubId]", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getClubByIdMock.mockReset();
    updateClubMock.mockReset();
    requestPlanChangeMock.mockReset();
    getClubOwnerMock.mockReset();
    dispatchMock.mockReset();
    requireAdminMock.mockResolvedValue({
      ok: true,
      context: { userId: "user_admin" },
    });
    getClubByIdMock.mockResolvedValue({ id: "club_1", name: "Existing" });
    getClubOwnerMock.mockResolvedValue(null);
    dispatchMock.mockResolvedValue(undefined);
  });

  it("returns the auth failure response as-is when the caller is not an admin", async () => {
    const forbidden = new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
    requireAdminMock.mockResolvedValue({ ok: false, response: forbidden });

    const response = await PATCH(
      makePatchRequest({ name: "New" }),
      makeParams(),
    );

    expect(response).toBe(forbidden);
    expect(updateClubMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the clubId does not match any club, without calling updateClub", async () => {
    getClubByIdMock.mockResolvedValue(null);

    const response = await PATCH(
      makePatchRequest({ name: "New" }),
      makeParams("club_unknown"),
    );

    expect(response.status).toBe(404);
    expect(updateClubMock).not.toHaveBeenCalled();
  });

  it("updates non-plan fields directly via updateClub, keyed by the route's clubId (not the caller's own club)", async () => {
    updateClubMock.mockResolvedValue({ id: "club_1", name: "New Name" });

    const response = await PATCH(
      makePatchRequest({ name: "New Name" }),
      makeParams(),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ club: { id: "club_1", name: "New Name" } });
    expect(requestPlanChangeMock).not.toHaveBeenCalled();
    expect(updateClubMock).toHaveBeenCalledWith(
      "club_1",
      { name: "New Name" },
      "user_admin",
    );
  });

  it("routes a plan change through requestPlanChange instead of writing Club.plan directly", async () => {
    requestPlanChangeMock.mockResolvedValue({
      clubId: "club_1",
      pendingPlan: "PRO",
    });
    updateClubMock.mockResolvedValue({ id: "club_1", plan: "BASIC" });

    const response = await PATCH(
      makePatchRequest({ plan: "PRO" }),
      makeParams(),
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(requestPlanChangeMock).toHaveBeenCalledWith({
      clubId: "club_1",
      newPlan: "PRO",
    });
    expect(updateClubMock).toHaveBeenCalledWith("club_1", {}, "user_admin");
    expect(json).toEqual({ club: { id: "club_1", plan: "BASIC" } });
  });

  it("returns 409 with the service's error message when requestPlanChange rejects the change", async () => {
    requestPlanChangeMock.mockRejectedValue(
      new Error("Plan changes can only be requested while ACTIVE"),
    );

    const response = await PATCH(
      makePatchRequest({ plan: "PRO" }),
      makeParams(),
    );

    expect(response.status).toBe(409);
    expect(updateClubMock).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid input", async () => {
    const response = await PATCH(
      makePatchRequest({ plan: "NOT_A_PLAN" }),
      makeParams(),
    );

    expect(response.status).toBe(400);
    expect(requestPlanChangeMock).not.toHaveBeenCalled();
    expect(updateClubMock).not.toHaveBeenCalled();
  });

  // The real gap reported: the owner had zero live signal that an admin
  // touched their club's settings on their behalf.
  it("notifies the club owner in-app that an admin updated their club", async () => {
    updateClubMock.mockResolvedValue({ id: "club_1", name: "New Name" });
    getClubOwnerMock.mockResolvedValue({
      id: "user_owner",
      displayName: "Owner Person",
      email: "owner@example.com",
    });

    await PATCH(makePatchRequest({ name: "New Name" }), makeParams());

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CLUB_UPDATED_BY_ADMIN",
        clubId: "club_1",
        recipientId: "user_owner",
        recipientEmail: "owner@example.com",
        sendEmail: false,
      }),
    );
  });

  it("does not notify when the club has no owner on record", async () => {
    updateClubMock.mockResolvedValue({ id: "club_1", name: "New Name" });
    getClubOwnerMock.mockResolvedValue(null);

    await PATCH(makePatchRequest({ name: "New Name" }), makeParams());

    expect(dispatchMock).not.toHaveBeenCalled();
  });
});
