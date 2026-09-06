import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { logSystemJobMock } = vi.hoisted(() => ({
  logSystemJobMock: vi.fn(),
}));

vi.mock("@/core/systemJobs/services/systemJobs.service", () => ({
  logSystemJob: logSystemJobMock,
}));

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

vi.mock("@/lib/mercadopago/membershipWebhookHandlers", () => ({
  handleSubscriptionPreapprovalTopic: vi.fn(),
  handleMembershipPaymentTopic: vi.fn(),
}));

import { verifyMercadoPagoSignature } from "@/lib/mercadopago/webhookSignature";
import { getMercadoPagoPayment } from "@/lib/mercadopago/payments";
import {
  findReservationById,
  confirmReservationPayment,
  checkCourtClosureConflict,
  checkCourtConflict,
} from "@/core/reservations/services/reservations.service";
import {
  getInvoiceByReservationId,
  recordPayment,
} from "@/core/billing/services/billing.service";
import { getClubOwner } from "@/core/clubs/services/clubs.service";
import { dispatch } from "@/lib/notifications/dispatcher";
import {
  handleSubscriptionPreapprovalTopic,
  handleMembershipPaymentTopic,
} from "@/lib/mercadopago/membershipWebhookHandlers";
import { NextResponse } from "next/server";
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
const checkCourtConflictMock = checkCourtConflict as ReturnType<typeof vi.fn>;
const getInvoiceByReservationIdMock = getInvoiceByReservationId as ReturnType<
  typeof vi.fn
>;
const recordPaymentMock = recordPayment as ReturnType<typeof vi.fn>;
const getClubOwnerMock = getClubOwner as ReturnType<typeof vi.fn>;
const dispatchMock = dispatch as ReturnType<typeof vi.fn>;
const handleSubscriptionPreapprovalTopicMock =
  handleSubscriptionPreapprovalTopic as ReturnType<typeof vi.fn>;
const handleMembershipPaymentTopicMock =
  handleMembershipPaymentTopic as ReturnType<typeof vi.fn>;

function makeRequest(params: {
  reservationId?: string;
  dataId?: string;
  signature?: string | null;
  requestId?: string | null;
  type?: string;
  body?: unknown;
}) {
  const url = new URL("http://localhost/api/webhooks/mercadopago");
  if (params.reservationId !== undefined) {
    url.searchParams.set("reservationId", params.reservationId);
  }
  if (params.dataId !== undefined) {
    url.searchParams.set("data.id", params.dataId);
  }
  if (params.type !== undefined) {
    url.searchParams.set("type", params.type);
  }
  const headers = new Headers();
  if (params.signature !== null) {
    headers.set("x-signature", params.signature ?? "ts=1,v1=abc");
  }
  if (params.requestId !== null) {
    headers.set("x-request-id", params.requestId ?? "req-1");
  }
  if (params.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
  });
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
  checkCourtConflictMock.mockReset();
  getInvoiceByReservationIdMock.mockReset();
  recordPaymentMock.mockReset();
  getClubOwnerMock.mockReset();
  dispatchMock.mockReset();
  handleSubscriptionPreapprovalTopicMock.mockReset();
  handleMembershipPaymentTopicMock.mockReset();
  logSystemJobMock.mockReset();

  verifyMercadoPagoSignatureMock.mockReturnValue(true);
  getClubOwnerMock.mockResolvedValue({
    id: "owner_1",
    displayName: "Owner One",
    photoURL: null,
    email: "owner@example.com",
  });
  handleSubscriptionPreapprovalTopicMock.mockResolvedValue(
    NextResponse.json({ ok: true }),
  );
  handleMembershipPaymentTopicMock.mockResolvedValue(
    NextResponse.json({ ok: true }),
  );
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
    checkCourtConflictMock.mockResolvedValue(false);

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
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it("does NOT confirm the reservation when another reservation now overlaps the same court/time — the payment was still captured and recorded, but the slot must be resolved manually", async () => {
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
    checkCourtConflictMock.mockResolvedValue(true);

    const response = await POST(
      makeRequest({ reservationId: "res_1", dataId: "12345" }),
    );

    // The payment is real money already captured by Mercado Pago — it must
    // still be recorded — but the reservation itself is left unconfirmed
    // (SCHEDULED) rather than silently double-booking the slot. The webhook
    // still acks 200 so Mercado Pago doesn't keep retrying delivery.
    expect(recordPaymentMock).toHaveBeenCalled();
    expect(confirmReservationPaymentMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);

    expect(checkCourtConflictMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_1",
        courtId: "court_1",
        excludeId: "res_1",
      }),
    );

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RESERVATION_PAYMENT_CONFLICT",
        clubId: "club_1",
        recipientId: "owner_1",
        recipientEmail: "owner@example.com",
        recipientName: "Owner One",
        sendEmail: false,
      }),
    );
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

// Consolidation fix: Mercado Pago's DevPanel registers exactly ONE
// notification URL per environment (confirmed against the real DevPanel),
// not one per subscribed topic — every topic this app subscribes to
// (payment, subscription_preapproval) is delivered to THIS route. A
// previously separate `app/api/webhooks/mercadopago/membership/route.ts`
// was therefore unreachable in any real deployment. These tests cover only
// the DISPATCH logic (which handler gets called for which `type`); the
// handlers' own business logic is covered directly in
// `lib/mercadopago/membershipWebhookHandlers.test.ts`.
describe("POST /api/webhooks/mercadopago — type-based dispatch to membership handlers", () => {
  it("returns 401 before dispatching to any membership handler when the signature is invalid", async () => {
    verifyMercadoPagoSignatureMock.mockReturnValue(false);

    const response = await POST(
      makeRequest({
        body: {
          type: "subscription_preapproval",
          data: { id: "preap_1" },
          id: "notif_1",
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(handleSubscriptionPreapprovalTopicMock).not.toHaveBeenCalled();
    expect(handleMembershipPaymentTopicMock).not.toHaveBeenCalled();
  });

  it("dispatches to handleSubscriptionPreapprovalTopic when type is subscription_preapproval in the JSON body", async () => {
    const response = await POST(
      makeRequest({
        body: {
          type: "subscription_preapproval",
          data: { id: "preap_1" },
          id: "notif_1",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(handleSubscriptionPreapprovalTopicMock).toHaveBeenCalledWith(
      "preap_1",
      "notif_1",
    );
    expect(handleMembershipPaymentTopicMock).not.toHaveBeenCalled();
    expect(findReservationByIdMock).not.toHaveBeenCalled();
  });

  it("dispatches to handleSubscriptionPreapprovalTopic when type/data.id arrive as query params instead of a JSON body", async () => {
    const response = await POST(
      makeRequest({ type: "subscription_preapproval", dataId: "preap_2" }),
    );

    expect(response.status).toBe(200);
    expect(handleSubscriptionPreapprovalTopicMock).toHaveBeenCalledWith(
      "preap_2",
      null,
    );
  });

  it("dispatches to handleMembershipPaymentTopic when type is payment and no reservationId is present (ANNUAL membership payment)", async () => {
    const response = await POST(
      makeRequest({
        body: { type: "payment", data: { id: "pay_1" }, id: "notif_pay_1" },
      }),
    );

    expect(response.status).toBe(200);
    expect(handleMembershipPaymentTopicMock).toHaveBeenCalledWith(
      expect.anything(),
      "pay_1",
      "notif_pay_1",
    );
    expect(handleSubscriptionPreapprovalTopicMock).not.toHaveBeenCalled();
    expect(findReservationByIdMock).not.toHaveBeenCalled();
  });

  it("routes a payment-type notification to the reservation flow (not handleMembershipPaymentTopic) when reservationId IS present", async () => {
    findReservationByIdMock.mockResolvedValue(RESERVATION);
    getMercadoPagoPaymentMock.mockResolvedValue({
      id: 12345,
      status: "pending",
      externalReference: "res_1",
      transactionAmount: 1000,
    });

    const response = await POST(
      makeRequest({
        reservationId: "res_1",
        body: { type: "payment", data: { id: "12345" }, id: "notif_1" },
      }),
    );

    expect(response.status).toBe(200);
    expect(handleMembershipPaymentTopicMock).not.toHaveBeenCalled();
    expect(handleSubscriptionPreapprovalTopicMock).not.toHaveBeenCalled();
    expect(findReservationByIdMock).toHaveBeenCalledWith("res_1");
  });
});

// This route's internal branching/business logic is untouched by the
// instrumentation below — POST is only a thin outer log-and-return/
// log-and-rethrow shell around the exact same handler (see AGENTS.md-adjacent
// system-status feature notes). These tests cover ONLY the added logging
// behavior; every test above already proves the internal logic itself is
// unchanged.
describe("POST /api/webhooks/mercadopago — system job logging", () => {
  it("logs a SUCCESS entry when the response is 2xx", async () => {
    const response = await POST(makeRequest({ dataId: "12345" }));

    expect(response.status).toBe(200);
    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "WEBHOOK",
        name: "mercadopago",
        status: "SUCCESS",
        startedAt: expect.any(Date),
        finishedAt: expect.any(Date),
      }),
    );
  });

  it("logs a FAILURE entry (with the response body as the error message) when the response is not 2xx", async () => {
    verifyMercadoPagoSignatureMock.mockReturnValue(false);

    const response = await POST(
      makeRequest({ reservationId: "res_1", dataId: "12345" }),
    );

    expect(response.status).toBe(401);
    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "WEBHOOK",
        name: "mercadopago",
        status: "FAILURE",
        errorMessage: expect.stringContaining("Invalid signature"),
      }),
    );
  });

  it("logs a FAILURE entry and still lets the error propagate when the handler itself throws unexpectedly", async () => {
    verifyMercadoPagoSignatureMock.mockImplementation(() => {
      throw new Error("unexpected crash");
    });

    await expect(
      POST(makeRequest({ reservationId: "res_1", dataId: "12345" })),
    ).rejects.toThrow("unexpected crash");

    expect(logSystemJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "WEBHOOK",
        name: "mercadopago",
        status: "FAILURE",
        errorMessage: "unexpected crash",
      }),
    );
  });
});
