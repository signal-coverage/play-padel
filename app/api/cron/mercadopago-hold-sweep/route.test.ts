import { describe, it, expect, vi, beforeEach } from "vitest";

// Same vi.hoisted convention as bank-transfer-hold-sweep/route.test.ts — mock
// fns referenced inside a hoisted vi.mock factory must themselves be
// declared via vi.hoisted.
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
import { MP_HOLD_EXPIRY_ACTOR } from "@/core/reservations/consts";

const CRON_SECRET_FOR_TESTS = "sweep-secret";

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost/api/cron/mercadopago-hold-sweep", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/mercadopago-hold-sweep", () => {
  beforeEach(() => {
    reservationFindManyMock.mockReset().mockResolvedValue([]);
    reservationUpdateMock.mockReset();
    userProfileFindUniqueMock.mockReset().mockResolvedValue({
      email: "user1@example.com",
      displayName: "Nico Sanchez",
    });
    dispatchMock.mockReset();
    vi.stubEnv("CRON_SECRET", CRON_SECRET_FOR_TESTS);
  });

  it("rejects a request without the correct CRON_SECRET bearer token", async () => {
    const res = await GET(makeRequest("Bearer wrong-value"));
    expect(res.status).toBe(401);
  });

  it("queries only lapsed, un-notified MERCADOPAGO holds", async () => {
    await GET(makeRequest(`Bearer ${CRON_SECRET_FOR_TESTS}`));
    expect(reservationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "SCHEDULED",
          paymentMethod: "MERCADOPAGO",
          paymentExpiresAt: expect.objectContaining({ lt: expect.any(Date) }),
          expiryNotifiedAt: null,
        }),
      }),
    );
  });

  it("emails the player once per lapsed, un-notified MERCADOPAGO hold", async () => {
    reservationFindManyMock.mockResolvedValue([
      {
        id: "res-1",
        userId: "user-1",
        userName: "Nico Sanchez",
        courtName: "Court test 1",
        scheduledStart: new Date("2026-09-15T21:00:00Z"),
      },
    ]);

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET_FOR_TESTS}`));

    expect(res.status).toBe(200);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RESERVATION_PAYMENT_HOLD_EXPIRED",
        recipientId: "user-1",
      }),
    );
  });

  it("performs the backstop cleanup: cancels the hold and stamps expiryNotifiedAt in the same update", async () => {
    reservationFindManyMock.mockResolvedValue([
      {
        id: "res-1",
        userId: "user-1",
        userName: "Nico Sanchez",
        courtName: "Court test 1",
        scheduledStart: new Date("2026-09-15T21:00:00Z"),
      },
    ]);

    await GET(makeRequest(`Bearer ${CRON_SECRET_FOR_TESTS}`));

    expect(reservationUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "res-1" },
        data: expect.objectContaining({
          status: "CANCELLED",
          cancelledBy: MP_HOLD_EXPIRY_ACTOR,
          updatedBy: MP_HOLD_EXPIRY_ACTOR,
          expiryNotifiedAt: expect.any(Date),
        }),
      }),
    );
  });
});
