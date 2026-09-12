import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted above every other statement in this file
// (including top-level `const`s declared before them in source order), so
// any mock fn referenced inside a factory must itself be declared via
// vi.hoisted — same pattern membership-grace-sweep/route.test.ts uses for
// its own logSystemJobMock.
const {
  reservationFindManyMock,
  reservationUpdateMock,
  userProfileFindUniqueMock,
  dispatchMock,
} = vi.hoisted(() => ({
  reservationFindManyMock: vi.fn(),
  reservationUpdateMock: vi.fn(),
  userProfileFindUniqueMock: vi.fn(),
  dispatchMock: vi.fn(),
}));

// The route looks up each reservation's owner via prisma.userProfile
// (same convention as reservations.service.ts's notifyReservationUpdated /
// cancellation dispatch) to get a live email/displayName rather than relying
// on the reservation's own denormalized userName — so this mock needs a
// userProfile branch too, not just reservation.
vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    reservation: {
      findMany: reservationFindManyMock,
      update: reservationUpdateMock,
    },
    userProfile: {
      findUnique: userProfileFindUniqueMock,
    },
  },
}));
vi.mock("@/lib/notifications/dispatcher", () => ({ dispatch: dispatchMock }));
vi.mock("@/core/systemJobs/services/systemJobs.service", () => ({
  logSystemJob: vi.fn(),
}));

import { GET } from "./route";

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost/api/cron/bank-transfer-hold-sweep", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/bank-transfer-hold-sweep", () => {
  beforeEach(() => {
    reservationFindManyMock.mockReset().mockResolvedValue([]);
    reservationUpdateMock.mockReset();
    userProfileFindUniqueMock.mockReset().mockResolvedValue({
      email: "user1@example.com",
      displayName: "Nico Sanchez",
    });
    dispatchMock.mockReset();
    vi.stubEnv("CRON_SECRET", "test-secret");
  });

  it("rejects a request without the correct CRON_SECRET bearer token", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("emails the player once per lapsed, un-notified TRANSFER hold and stamps expiryNotifiedAt", async () => {
    reservationFindManyMock.mockResolvedValue([
      {
        id: "res-1",
        userId: "user-1",
        userName: "Nico Sanchez",
        courtName: "Court test 1",
        scheduledStart: new Date("2026-09-15T21:00:00Z"),
      },
    ]);

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(200);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RESERVATION_PAYMENT_HOLD_EXPIRED",
        recipientId: "user-1",
      }),
    );
    expect(reservationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "res-1" },
        data: expect.objectContaining({ expiryNotifiedAt: expect.any(Date) }),
      }),
    );
  });

  it("queries only lapsed, un-notified TRANSFER holds", async () => {
    await GET(makeRequest("Bearer test-secret"));
    expect(reservationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "SCHEDULED",
          paymentMethod: "TRANSFER",
          paymentExpiresAt: expect.objectContaining({ lt: expect.any(Date) }),
          expiryNotifiedAt: null,
        }),
      }),
    );
  });

  it("never touches reservation status or the invoice — only stamps expiryNotifiedAt", async () => {
    reservationFindManyMock.mockResolvedValue([
      {
        id: "res-1",
        userId: "user-1",
        userName: "Nico Sanchez",
        courtName: "Court test 1",
        scheduledStart: new Date("2026-09-15T21:00:00Z"),
      },
    ]);
    await GET(makeRequest("Bearer test-secret"));
    const updateCall = reservationUpdateMock.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("status");
  });
});
