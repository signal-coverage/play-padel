import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/core/reservations/services/reservations.service", () => ({
  cancelReservation: vi.fn(),
  completeReservation: vi.fn(),
  getReservation: vi.fn(),
  noShowReservation: vi.fn(),
}));

import { requireOwnerClub } from "../../_lib/require-owner";
import {
  cancelReservation,
  completeReservation,
  getReservation,
  noShowReservation,
} from "@/core/reservations/services/reservations.service";
import { PATCH } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const getReservationMock = getReservation as ReturnType<typeof vi.fn>;
const cancelReservationMock = cancelReservation as ReturnType<typeof vi.fn>;
const completeReservationMock = completeReservation as ReturnType<typeof vi.fn>;
const noShowReservationMock = noShowReservation as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/clubs/reservations/res_1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

function makeParams(reservationId = "res_1") {
  return { params: Promise.resolve({ reservationId }) };
}

beforeEach(() => {
  requireOwnerClubMock.mockReset();
  getReservationMock.mockReset();
  cancelReservationMock.mockReset();
  completeReservationMock.mockReset();
  noShowReservationMock.mockReset();

  requireOwnerClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "owner_1", clubId: "club_1" },
  });
  getReservationMock.mockResolvedValue({ id: "res_1", clubId: "club_1" });
});

describe("PATCH /api/clubs/reservations/[reservationId]", () => {
  it("returns 404 when the reservation doesn't belong to the caller's club", async () => {
    getReservationMock.mockResolvedValue(null);

    const response = await PATCH(
      makeRequest({ action: "cancel" }),
      makeParams(),
    );

    expect(response.status).toBe(404);
    expect(cancelReservationMock).not.toHaveBeenCalled();
  });

  // Reservations are non-refundable — cancelling one with a completed
  // payment must go straight to cancelReservation with no refund/invoice
  // lookup in between. There's nothing left to mock a refund call against
  // (the route has no billing/refund import at all anymore), so an
  // accidental reintroduction of one would surface here as an
  // unmocked-module failure rather than a silent pass.
  it("cancels a reservation with a completed payment without issuing any refund", async () => {
    cancelReservationMock.mockResolvedValue({
      id: "res_1",
      status: "CANCELLED",
    });

    const response = await PATCH(
      makeRequest({ action: "cancel" }),
      makeParams(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reservation.status).toBe("CANCELLED");
    expect(cancelReservationMock).toHaveBeenCalledWith("res_1", "owner_1");
  });
});
