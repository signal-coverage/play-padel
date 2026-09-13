import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../../_lib/require-owner", () => ({
  requireOwnerClub: vi.fn(),
}));

vi.mock("@/core/reservations/services/reservations.service", () => ({
  cancelReservation: vi.fn(),
  completeReservation: vi.fn(),
  confirmReservationPayment: vi.fn(),
  getReservation: vi.fn(),
  noShowReservation: vi.fn(),
  checkCourtClosureConflict: vi.fn(),
  checkCourtConflict: vi.fn(),
}));

vi.mock("@/core/billing/services/billing.service", () => ({
  getInvoiceByReservationId: vi.fn(),
  recordPayment: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  getClubOwner: vi.fn(),
}));

vi.mock("@/lib/notifications/dispatcher", () => ({
  dispatch: vi.fn(),
}));

import { requireOwnerClub } from "../../_lib/require-owner";
import {
  cancelReservation,
  completeReservation,
  confirmReservationPayment,
  getReservation,
  noShowReservation,
  checkCourtClosureConflict,
  checkCourtConflict,
} from "@/core/reservations/services/reservations.service";
import {
  getInvoiceByReservationId,
  recordPayment,
} from "@/core/billing/services/billing.service";
import { getClubOwner } from "@/core/clubs/services/clubs.service";
import { dispatch } from "@/lib/notifications/dispatcher";
import { PATCH } from "./route";

const requireOwnerClubMock = requireOwnerClub as ReturnType<typeof vi.fn>;
const getReservationMock = getReservation as ReturnType<typeof vi.fn>;
const cancelReservationMock = cancelReservation as ReturnType<typeof vi.fn>;
const completeReservationMock = completeReservation as ReturnType<typeof vi.fn>;
const noShowReservationMock = noShowReservation as ReturnType<typeof vi.fn>;
const confirmReservationPaymentMock = confirmReservationPayment as ReturnType<
  typeof vi.fn
>;
const checkCourtClosureConflictMock = checkCourtClosureConflict as ReturnType<
  typeof vi.fn
>;
const checkCourtConflictMock = checkCourtConflict as ReturnType<typeof vi.fn>;
const getInvoiceByReservationIdMock = getInvoiceByReservationId as ReturnType<
  typeof vi.fn
>;
const recordPaymentMock = recordPayment as ReturnType<typeof vi.fn>;
const getClubOwnerMock = getClubOwner as ReturnType<typeof vi.fn>;
const dispatchMock = dispatch as ReturnType<typeof vi.fn>;

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
  confirmReservationPaymentMock.mockReset();
  checkCourtClosureConflictMock.mockReset();
  checkCourtConflictMock.mockReset();
  getInvoiceByReservationIdMock.mockReset();
  recordPaymentMock.mockReset();
  getClubOwnerMock.mockReset();
  dispatchMock.mockReset();

  requireOwnerClubMock.mockResolvedValue({
    ok: true,
    context: { userId: "owner_1", clubId: "club_1" },
  });
  getReservationMock.mockResolvedValue({ id: "res_1", clubId: "club_1" });
  // Defaults matching the Mercado Pago webhook's own re-check behavior
  // (app/api/webhooks/mercadopago/route.ts): no closure, no overlap — so
  // existing confirmTransfer tests that don't care about this re-check keep
  // passing unchanged.
  checkCourtClosureConflictMock.mockResolvedValue(null);
  checkCourtConflictMock.mockResolvedValue(false);
  getClubOwnerMock.mockResolvedValue({
    id: "owner_1",
    displayName: "Owner One",
    photoURL: null,
    email: "owner@example.com",
  });
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

  const TRANSFER_RESERVATION = {
    id: "res-1",
    clubId: "club_1",
    status: "SCHEDULED",
    courtId: "court_1",
    paymentMethod: "TRANSFER",
    paymentExpiresAt: new Date(Date.now() + 10 * 60_000),
    scheduledStart: new Date("2027-01-01T10:00:00.000Z"),
    scheduledEnd: new Date("2027-01-01T11:00:00.000Z"),
  };

  it("confirms a pending, unexpired TRANSFER hold: records the payment and flips the reservation to CONFIRMED", async () => {
    getReservationMock.mockResolvedValue(TRANSFER_RESERVATION);
    getInvoiceByReservationIdMock.mockResolvedValue({
      id: "inv-1",
      status: "ISSUED",
      total: 5000,
      currency: "ARS",
    });
    confirmReservationPaymentMock.mockResolvedValue({
      id: "res-1",
      status: "CONFIRMED",
    });

    const res = await PATCH(
      makeRequest({ action: "confirmTransfer" }),
      makeParams("res-1"),
    );

    expect(res.status).toBe(200);
    expect(recordPaymentMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        invoiceId: "inv-1",
        method: "TRANSFER",
        amount: 5000,
        currency: "ARS",
      }),
    );
    // Same re-check the Mercado Pago webhook already does before confirming
    // (see app/api/webhooks/mercadopago/route.ts) — excludeId so this
    // reservation's own row never counts as its own conflict.
    expect(checkCourtClosureConflictMock).toHaveBeenCalledWith(
      expect.objectContaining({ courtId: "court_1" }),
    );
    expect(checkCourtConflictMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_1",
        courtId: "court_1",
        excludeId: "res-1",
      }),
    );
    // The real owner confirming the transfer must be recorded as the actor —
    // not the Mercado Pago webhook's default attribution.
    expect(confirmReservationPaymentMock).toHaveBeenCalledWith(
      "res-1",
      "owner_1",
    );
  });

  it("does NOT confirm the reservation when the court was closed after the payment was recorded — payment stays captured, owner is notified, reservation stays SCHEDULED", async () => {
    getReservationMock.mockResolvedValue(TRANSFER_RESERVATION);
    getInvoiceByReservationIdMock.mockResolvedValue({
      id: "inv-1",
      status: "ISSUED",
      total: 5000,
      currency: "ARS",
    });
    checkCourtClosureConflictMock.mockResolvedValue("Court maintenance");

    const res = await PATCH(
      makeRequest({ action: "confirmTransfer" }),
      makeParams("res-1"),
    );
    const body = await res.json();

    expect(recordPaymentMock).toHaveBeenCalled();
    expect(confirmReservationPaymentMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(body.reservation.status).toBe("SCHEDULED");
    expect(typeof body.warning).toBe("string");
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RESERVATION_PAYMENT_CONFLICT",
        clubId: "club_1",
        recipientId: "owner_1",
      }),
    );
  });

  it("does NOT confirm the reservation when another reservation now overlaps the same slot after the payment was recorded — mirrors the Mercado Pago webhook's own handling of this scenario", async () => {
    getReservationMock.mockResolvedValue(TRANSFER_RESERVATION);
    getInvoiceByReservationIdMock.mockResolvedValue({
      id: "inv-1",
      status: "ISSUED",
      total: 5000,
      currency: "ARS",
    });
    checkCourtConflictMock.mockResolvedValue(true);

    const res = await PATCH(
      makeRequest({ action: "confirmTransfer" }),
      makeParams("res-1"),
    );
    const body = await res.json();

    expect(recordPaymentMock).toHaveBeenCalled();
    expect(confirmReservationPaymentMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(body.reservation.status).toBe("SCHEDULED");
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "RESERVATION_PAYMENT_CONFLICT" }),
    );
  });

  it("never leaves an already-captured payment silently swallowed by a bare 500 when confirmReservationPayment itself fails — notifies the owner and reports a warning instead", async () => {
    getReservationMock.mockResolvedValue(TRANSFER_RESERVATION);
    getInvoiceByReservationIdMock.mockResolvedValue({
      id: "inv-1",
      status: "ISSUED",
      total: 5000,
      currency: "ARS",
    });
    confirmReservationPaymentMock.mockRejectedValue(
      new Error("exclusion constraint violation"),
    );

    const res = await PATCH(
      makeRequest({ action: "confirmTransfer" }),
      makeParams("res-1"),
    );
    const body = await res.json();

    expect(recordPaymentMock).toHaveBeenCalled();
    // The old behavior returned a bare 500 "Failed to update reservation"
    // here, indistinguishable from "nothing happened" — even though the
    // payment was already permanently committed. That must never happen.
    expect(res.status).not.toBe(500);
    expect(body.error).not.toBe("Failed to update reservation");
    expect(typeof body.warning).toBe("string");
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "RESERVATION_PAYMENT_CONFLICT" }),
    );
  });

  it("returns 409 without touching recordPayment/confirmReservationPayment when the invoice was already confirmed (double-confirm)", async () => {
    getReservationMock.mockResolvedValue({
      id: "res-1",
      status: "SCHEDULED",
      paymentMethod: "TRANSFER",
      paymentExpiresAt: new Date(Date.now() + 10 * 60_000),
    });
    getInvoiceByReservationIdMock.mockResolvedValue({
      id: "inv-1",
      status: "PAID",
      total: 5000,
      currency: "ARS",
    });

    const res = await PATCH(
      makeRequest({ action: "confirmTransfer" }),
      makeParams("res-1"),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toBe("This payment was already confirmed");
    expect(recordPaymentMock).not.toHaveBeenCalled();
    expect(confirmReservationPaymentMock).not.toHaveBeenCalled();
  });

  it("rejects confirming a TRANSFER hold whose paymentExpiresAt has already passed", async () => {
    getReservationMock.mockResolvedValue({
      id: "res-1",
      status: "SCHEDULED",
      paymentMethod: "TRANSFER",
      paymentExpiresAt: new Date(Date.now() - 60_000),
    });

    const res = await PATCH(
      makeRequest({ action: "confirmTransfer" }),
      makeParams("res-1"),
    );

    expect(res.status).toBe(409);
    expect(recordPaymentMock).not.toHaveBeenCalled();
    expect(confirmReservationPaymentMock).not.toHaveBeenCalled();
  });

  it("rejects confirming a reservation that isn't a pending TRANSFER hold", async () => {
    getReservationMock.mockResolvedValue({
      id: "res-1",
      status: "CONFIRMED",
      paymentMethod: "MERCADOPAGO",
      paymentExpiresAt: null,
    });

    const res = await PATCH(
      makeRequest({ action: "confirmTransfer" }),
      makeParams("res-1"),
    );

    expect(res.status).toBe(409);
  });
});
