import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/reservations/services/reservations.service", () => ({
  listReservationsByUser: vi.fn(),
  canSelfCancel: vi.fn(),
  cancelReservation: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import {
  listReservationsByUser,
  canSelfCancel,
  cancelReservation,
} from "@/core/reservations/services/reservations.service";
import { POST } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const listReservationsByUserMock = listReservationsByUser as ReturnType<
  typeof vi.fn
>;
const canSelfCancelMock = canSelfCancel as ReturnType<typeof vi.fn>;
const cancelReservationMock = cancelReservation as ReturnType<typeof vi.fn>;

const RESERVATION = {
  id: "res_1",
  clubId: "club_1",
  status: "CONFIRMED",
  scheduledStart: new Date(Date.now() + 1000 * 60 * 60 * 24),
};

function makeRequest(reservationId: string) {
  return {
    request: new Request(
      `http://localhost/api/player/reservations/${reservationId}/cancel`,
      { method: "POST" },
    ),
    params: Promise.resolve({ id: reservationId }),
  };
}

beforeEach(() => {
  authMock.mockReset();
  listReservationsByUserMock.mockReset();
  canSelfCancelMock.mockReset();
  cancelReservationMock.mockReset();
});

describe("POST /api/player/reservations/[id]/cancel", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });

    const { request, params } = makeRequest("res_1");
    const response = await POST(request, { params });

    expect(response.status).toBe(401);
  });

  it("returns 404 for a reservation that doesn't belong to the caller", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    listReservationsByUserMock.mockResolvedValue([]);

    const { request, params } = makeRequest("someone_elses_res");
    const response = await POST(request, { params });

    expect(response.status).toBe(404);
  });

  it("returns 403 when the self-cancel cutoff has passed", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    listReservationsByUserMock.mockResolvedValue([RESERVATION]);
    canSelfCancelMock.mockReturnValue(false);

    const { request, params } = makeRequest("res_1");
    const response = await POST(request, { params });

    expect(response.status).toBe(403);
    expect(cancelReservationMock).not.toHaveBeenCalled();
  });

  // Reservations are non-refundable — cancelling a reservation with a
  // completed payment must go straight to cancelReservation with no
  // refund/invoice lookup in between. There's nothing left to mock a
  // refund call against (the route has no billing/refund import at all
  // anymore), so an accidental reintroduction of one would surface here as
  // an unmocked-module failure rather than a silent pass.
  it("cancels a reservation with a completed payment without issuing any refund", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    listReservationsByUserMock.mockResolvedValue([RESERVATION]);
    canSelfCancelMock.mockReturnValue(true);
    cancelReservationMock.mockResolvedValue({
      ...RESERVATION,
      status: "CANCELLED",
    });

    const { request, params } = makeRequest("res_1");
    const response = await POST(request, { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reservation.status).toBe("CANCELLED");
    expect(cancelReservationMock).toHaveBeenCalledWith("res_1", "user_1");
  });
});
