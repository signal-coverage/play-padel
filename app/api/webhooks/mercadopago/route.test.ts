import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mercadopago/webhookSignature", () => ({
  verifyMercadoPagoSignature: vi.fn(),
}));

vi.mock("@/lib/mercadopago/payments", () => ({
  getMercadoPagoPayment: vi.fn(),
}));

vi.mock("@/core/reservations/services/reservations.service", () => ({
  findReservationById: vi.fn(),
  confirmReservationPayment: vi.fn(),
  checkCourtClosureConflict: vi.fn(),
}));

vi.mock("@/core/billing/services/billing.service", () => ({
  getInvoiceByReservationId: vi.fn(),
  recordPayment: vi.fn(),
}));

import { verifyMercadoPagoSignature } from "@/lib/mercadopago/webhookSignature";
import { getMercadoPagoPayment } from "@/lib/mercadopago/payments";
import {
  findReservationById,
  confirmReservationPayment,
  checkCourtClosureConflict,
} from "@/core/reservations/services/reservations.service";
import {
  getInvoiceByReservationId,
  recordPayment,
} from "@/core/billing/services/billing.service";
import { POST } from "./route";

const verifyMercadoPagoSignatureMock = verifyMercadoPagoSignature as ReturnType<
  typeof vi.fn
>;
const getMercadoPagoPaymentMock = getMercadoPagoPayment as ReturnType<
  typeof vi.fn
>;
const findReservationByIdMock = findReservationById as ReturnType<typeof vi.fn>;
const confirmReservationPaymentMock = confirmReservationPayment as ReturnType<
  typeof vi.fn
>;
const checkCourtClosureConflictMock = checkCourtClosureConflict as ReturnType<
  typeof vi.fn
>;
const getInvoiceByReservationIdMock = getInvoiceByReservationId as ReturnType<
  typeof vi.fn
>;
const recordPaymentMock = recordPayment as ReturnType<typeof vi.fn>;

function makeRequest(params: {
  reservationId?: string;
  dataId?: string;
  signature?: string | null;
  requestId?: string | null;
}) {
  const url = new URL("http://localhost/api/webhooks/mercadopago");
  if (params.reservationId !== undefined) {
    url.searchParams.set("reservationId", params.reservationId);
  }
  if (params.dataId !== undefined) {
    url.searchParams.set("data.id", params.dataId);
  }
  const headers = new Headers();
  if (params.signature !== null) {
    headers.set("x-signature", params.signature ?? "ts=1,v1=abc");
  }
  if (params.requestId !== null) {
    headers.set("x-request-id", params.requestId ?? "req-1");
  }
  return new NextRequest(url, { method: "POST", headers });
}

const RESERVATION = {
  id: "res_1",
  clubId: "club_1",
  courtId: "court_1",
  scheduledStart: new Date("2026-09-01T10:00:00Z"),
  scheduledEnd: new Date("2026-09-01T11:00:00Z"),
};

const INVOICE = { id: "invoice_1", total: 1000, currency: "ARS" };

beforeEach(() => {
  verifyMercadoPagoSignatureMock.mockReset();
  getMercadoPagoPaymentMock.mockReset();
  findReservationByIdMock.mockReset();
  confirmReservationPaymentMock.mockReset();
  checkCourtClosureConflictMock.mockReset();
  getInvoiceByReservationIdMock.mockReset();
  recordPaymentMock.mockReset();

  verifyMercadoPagoSignatureMock.mockReturnValue(true);
});

describe("POST /api/webhooks/mercadopago", () => {
  it("returns 401 and never resolves a club or fetches a payment when the signature is invalid", async () => {
    verifyMercadoPagoSignatureMock.mockReturnValue(false);

    const response = await POST(
      makeRequest({ reservationId: "res_1", dataId: "12345" }),
    );

    expect(response.status).toBe(401);
    expect(findReservationByIdMock).not.toHaveBeenCalled();
    expect(getMercadoPagoPaymentMock).not.toHaveBeenCalled();
  });

  it("acks and never fetches the payment when reservationId is missing (cannot resolve which club's token to use)", async () => {
    const response = await POST(makeRequest({ dataId: "12345" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(findReservationByIdMock).not.toHaveBeenCalled();
    expect(getMercadoPagoPaymentMock).not.toHaveBeenCalled();
  });

  it("resolves the reservation (and therefore the club) BEFORE fetching the payment", async () => {
    findReservationByIdMock.mockResolvedValue(RESERVATION);
    getMercadoPagoPaymentMock.mockResolvedValue({
      id: 12345,
      status: "pending",
      externalReference: "res_1",
      transactionAmount: 1000,
    });

    await POST(makeRequest({ reservationId: "res_1", dataId: "12345" }));

    expect(findReservationByIdMock).toHaveBeenCalledWith("res_1");
    expect(getMercadoPagoPaymentMock).toHaveBeenCalledWith("12345", "club_1");

    const reservationCallOrder =
      findReservationByIdMock.mock.invocationCallOrder[0];
    const paymentCallOrder =
      getMercadoPagoPaymentMock.mock.invocationCallOrder[0];
    expect(reservationCallOrder).toBeLessThan(paymentCallOrder);
  });

  it("acks without fetching the payment when the reservation cannot be found", async () => {
    findReservationByIdMock.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ reservationId: "res_missing", dataId: "12345" }),
    );

    expect(response.status).toBe(200);
    expect(getMercadoPagoPaymentMock).not.toHaveBeenCalled();
  });

  it("rejects when the fetched payment's external_reference does not match the resolved reservation", async () => {
    findReservationByIdMock.mockResolvedValue(RESERVATION);
    getMercadoPagoPaymentMock.mockResolvedValue({
      id: 12345,
      status: "approved",
      externalReference: "res_other",
      transactionAmount: 1000,
    });

    const response = await POST(
      makeRequest({ reservationId: "res_1", dataId: "12345" }),
    );

    expect(response.status).toBe(400);
    expect(recordPaymentMock).not.toHaveBeenCalled();
  });

  it("records the payment and confirms the reservation on a matching approved payment", async () => {
    findReservationByIdMock.mockResolvedValue(RESERVATION);
    getMercadoPagoPaymentMock.mockResolvedValue({
      id: 12345,
      status: "approved",
      externalReference: "res_1",
      transactionAmount: 1000,
    });
    getInvoiceByReservationIdMock.mockResolvedValue(INVOICE);
    recordPaymentMock.mockResolvedValue({ id: "payment_1" });
    checkCourtClosureConflictMock.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ reservationId: "res_1", dataId: "12345" }),
    );

    expect(response.status).toBe(200);
    expect(recordPaymentMock).toHaveBeenCalledWith(
      "club_1",
      "system:mercadopago-webhook",
      expect.objectContaining({
        invoiceId: "invoice_1",
        reference: "12345",
      }),
    );
    expect(confirmReservationPaymentMock).toHaveBeenCalledWith("res_1");
  });

  it("does not record a payment for a non-approved status", async () => {
    findReservationByIdMock.mockResolvedValue(RESERVATION);
    getMercadoPagoPaymentMock.mockResolvedValue({
      id: 12345,
      status: "pending",
      externalReference: "res_1",
      transactionAmount: 1000,
    });
    getInvoiceByReservationIdMock.mockResolvedValue(INVOICE);

    const response = await POST(
      makeRequest({ reservationId: "res_1", dataId: "12345" }),
    );

    expect(response.status).toBe(200);
    expect(recordPaymentMock).not.toHaveBeenCalled();
    expect(confirmReservationPaymentMock).not.toHaveBeenCalled();
  });
});
