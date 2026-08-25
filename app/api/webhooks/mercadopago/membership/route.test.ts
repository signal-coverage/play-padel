import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mercadopago/webhookSignature", () => ({
  verifyMercadoPagoSignature: vi.fn(),
}));

vi.mock("@/lib/mercadopago/membershipPreapprovals", () => ({
  getMembershipPreapproval: vi.fn(),
}));

vi.mock("@/lib/mercadopago/platformPreferences", () => ({
  getMembershipPayment: vi.fn(),
}));

vi.mock("@/core/billing/services/membership.service", () => {
  class InvalidMembershipTransitionError extends Error {
    constructor(from: string, to: string) {
      super(`Cannot transition membership status from ${from} to ${to}`);
      this.name = "InvalidMembershipTransitionError";
    }
  }
  return {
    findMembershipSubscriptionByPreapprovalId: vi.fn(),
    getMembershipSubscription: vi.fn(),
    recordSuccessfulCharge: vi.fn(),
    recordFailedCharge: vi.fn(),
    recordAutoCancellation: vi.fn(),
    InvalidMembershipTransitionError,
  };
});

import { verifyMercadoPagoSignature } from "@/lib/mercadopago/webhookSignature";
import { getMembershipPreapproval } from "@/lib/mercadopago/membershipPreapprovals";
import { getMembershipPayment } from "@/lib/mercadopago/platformPreferences";
import {
  findMembershipSubscriptionByPreapprovalId,
  getMembershipSubscription,
  recordSuccessfulCharge,
  recordFailedCharge,
  recordAutoCancellation,
  InvalidMembershipTransitionError,
} from "@/core/billing/services/membership.service";
import { POST, resolveMembershipWebhookDecision } from "./route";

const verifyMercadoPagoSignatureMock = verifyMercadoPagoSignature as ReturnType<
  typeof vi.fn
>;
const getMembershipPreapprovalMock = getMembershipPreapproval as ReturnType<
  typeof vi.fn
>;
const getMembershipPaymentMock = getMembershipPayment as ReturnType<
  typeof vi.fn
>;
const findMembershipSubscriptionByPreapprovalIdMock =
  findMembershipSubscriptionByPreapprovalId as ReturnType<typeof vi.fn>;
const getMembershipSubscriptionMock = getMembershipSubscription as ReturnType<
  typeof vi.fn
>;
const recordSuccessfulChargeMock = recordSuccessfulCharge as ReturnType<
  typeof vi.fn
>;
const recordFailedChargeMock = recordFailedCharge as ReturnType<typeof vi.fn>;
const recordAutoCancellationMock = recordAutoCancellation as ReturnType<
  typeof vi.fn
>;

function makeRequest(params: {
  body?: unknown;
  signature?: string | null;
  requestId?: string | null;
}) {
  const url = new URL("http://localhost/api/webhooks/mercadopago/membership");
  const headers = new Headers({ "content-type": "application/json" });
  if (params.signature !== null) {
    headers.set("x-signature", params.signature ?? "ts=1,v1=abc");
  }
  if (params.requestId !== null) {
    headers.set("x-request-id", params.requestId ?? "req-1");
  }
  return new NextRequest(url, {
    method: "POST",
    headers,
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
  });
}

const NOTIFICATION_BODY = {
  action: "updated",
  application_id: "567665326816887",
  data: { id: "preap_1" },
  date: "2026-08-24T12:00:00Z",
  entity: "preapproval",
  id: "notif_1",
  type: "subscription_preapproval",
  version: 8,
};

beforeEach(() => {
  verifyMercadoPagoSignatureMock.mockReset();
  getMembershipPreapprovalMock.mockReset();
  getMembershipPaymentMock.mockReset();
  findMembershipSubscriptionByPreapprovalIdMock.mockReset();
  getMembershipSubscriptionMock.mockReset();
  recordSuccessfulChargeMock.mockReset();
  recordFailedChargeMock.mockReset();
  recordAutoCancellationMock.mockReset();

  verifyMercadoPagoSignatureMock.mockReturnValue(true);
});

describe("resolveMembershipWebhookDecision (pure)", () => {
  it("resolves auto_cancellation when MP reports the preapproval as canceled", () => {
    expect(
      resolveMembershipWebhookDecision({
        status: "canceled",
        summarized: null,
      }),
    ).toEqual({ action: "auto_cancellation" });
  });

  it("resolves successful_charge for an authorized preapproval with no pending charge and a green semaphore", () => {
    expect(
      resolveMembershipWebhookDecision({
        status: "authorized",
        summarized: {
          chargedQuantity: 1,
          pendingChargeQuantity: 0,
          lastChargedDate: "2026-08-24T12:00:00Z",
          semaphore: "green",
        },
      }),
    ).toEqual({ action: "successful_charge" });
  });

  it("resolves successful_charge for an authorized preapproval with no summarized info at all (first authorization, nothing charged yet)", () => {
    expect(
      resolveMembershipWebhookDecision({
        status: "authorized",
        summarized: null,
      }),
    ).toEqual({ action: "successful_charge" });
  });

  it("resolves failed_charge for an authorized preapproval with a pending charge (MP recycling retry)", () => {
    expect(
      resolveMembershipWebhookDecision({
        status: "authorized",
        summarized: {
          chargedQuantity: 2,
          pendingChargeQuantity: 1,
          lastChargedDate: "2026-07-24T12:00:00Z",
          semaphore: "red",
        },
      }),
    ).toEqual({ action: "failed_charge" });
  });

  it("resolves failed_charge for an authorized preapproval with a yellow/red semaphore even if pendingChargeQuantity reads 0", () => {
    expect(
      resolveMembershipWebhookDecision({
        status: "authorized",
        summarized: {
          chargedQuantity: 2,
          pendingChargeQuantity: 0,
          lastChargedDate: "2026-07-24T12:00:00Z",
          semaphore: "yellow",
        },
      }),
    ).toEqual({ action: "failed_charge" });
  });

  it("resolves noop for a paused preapproval (expected manual-mode pause between cycles, not an error)", () => {
    expect(
      resolveMembershipWebhookDecision({ status: "paused", summarized: null }),
    ).toEqual({ action: "noop", reason: expect.stringContaining("paused") });
  });

  it("resolves noop for a pending preapproval (not yet authorized)", () => {
    expect(
      resolveMembershipWebhookDecision({ status: "pending", summarized: null }),
    ).toEqual({ action: "noop", reason: expect.stringContaining("pending") });
  });
});

describe("POST /api/webhooks/mercadopago/membership", () => {
  it("returns 401 and never resolves a subscription or fetches the preapproval when the signature is invalid", async () => {
    verifyMercadoPagoSignatureMock.mockReturnValue(false);

    const response = await POST(makeRequest({ body: NOTIFICATION_BODY }));

    expect(response.status).toBe(401);
    expect(
      findMembershipSubscriptionByPreapprovalIdMock,
    ).not.toHaveBeenCalled();
    expect(getMembershipPreapprovalMock).not.toHaveBeenCalled();
  });

  it("validates the signature using a distinct membership webhook secret, not the reservation webhook's", async () => {
    vi.stubEnv(
      "MERCADOPAGO_MEMBERSHIP_WEBHOOK_SECRET",
      "membership-secret-value",
    );

    await POST(makeRequest({ body: NOTIFICATION_BODY }));

    const callArgs = verifyMercadoPagoSignatureMock.mock.calls[0][0];
    expect(callArgs.dataId).toBe("preap_1");
    expect(callArgs.secret).toBe("membership-secret-value");

    vi.unstubAllEnvs();
  });

  it("acks without acting when the notification type is not subscription_preapproval", async () => {
    const response = await POST(
      makeRequest({ body: { ...NOTIFICATION_BODY, type: "payment" } }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(
      findMembershipSubscriptionByPreapprovalIdMock,
    ).not.toHaveBeenCalled();
    expect(getMembershipPreapprovalMock).not.toHaveBeenCalled();
  });

  it("acks without fetching the preapproval when no subscription references the given preapproval id (resolves club BEFORE fetching from MP)", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ body: NOTIFICATION_BODY }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(findMembershipSubscriptionByPreapprovalIdMock).toHaveBeenCalledWith(
      "preap_1",
    );
    expect(getMembershipPreapprovalMock).not.toHaveBeenCalled();
  });

  it("resolves the owning club BEFORE re-fetching the preapproval, and re-fetches BEFORE calling any state-machine transition", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "authorized",
      summarized: null,
    });
    recordSuccessfulChargeMock.mockResolvedValue({});

    await POST(makeRequest({ body: NOTIFICATION_BODY }));

    const resolveOrder =
      findMembershipSubscriptionByPreapprovalIdMock.mock.invocationCallOrder[0];
    const fetchOrder = getMembershipPreapprovalMock.mock.invocationCallOrder[0];
    const transitionOrder =
      recordSuccessfulChargeMock.mock.invocationCallOrder[0];

    expect(resolveOrder).toBeLessThan(fetchOrder);
    expect(fetchOrder).toBeLessThan(transitionOrder);
    expect(getMembershipPreapprovalMock).toHaveBeenCalledWith("preap_1");
  });

  it("never trusts the webhook body's own status — only the re-fetched preapproval decides the transition", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    // Webhook body carries no status at all (matches the real confirmed
    // payload shape) — the re-fetch is the ONLY source of truth.
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "canceled",
      summarized: null,
    });
    recordAutoCancellationMock.mockResolvedValue({});

    const response = await POST(makeRequest({ body: NOTIFICATION_BODY }));

    expect(response.status).toBe(200);
    expect(recordAutoCancellationMock).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: "club_1", webhookEventId: "notif_1" }),
    );
  });

  it("calls recordSuccessfulCharge for a healthy authorized preapproval", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "authorized",
      summarized: {
        chargedQuantity: 1,
        pendingChargeQuantity: 0,
        lastChargedDate: "2026-08-24T12:00:00Z",
        semaphore: "green",
      },
    });
    recordSuccessfulChargeMock.mockResolvedValue({});

    await POST(makeRequest({ body: NOTIFICATION_BODY }));

    expect(recordSuccessfulChargeMock).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: "club_1", webhookEventId: "notif_1" }),
    );
    expect(recordFailedChargeMock).not.toHaveBeenCalled();
    expect(recordAutoCancellationMock).not.toHaveBeenCalled();
  });

  it("calls recordFailedCharge for an authorized preapproval stuck in MP's own recycling retry", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "authorized",
      summarized: {
        chargedQuantity: 2,
        pendingChargeQuantity: 1,
        lastChargedDate: "2026-07-24T12:00:00Z",
        semaphore: "red",
      },
    });
    recordFailedChargeMock.mockResolvedValue({});

    await POST(makeRequest({ body: NOTIFICATION_BODY }));

    expect(recordFailedChargeMock).toHaveBeenCalledWith(
      expect.objectContaining({ clubId: "club_1", webhookEventId: "notif_1" }),
    );
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
  });

  it("does nothing (still acks 200) for a paused preapproval", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "paused",
      summarized: null,
    });

    const response = await POST(makeRequest({ body: NOTIFICATION_BODY }));

    expect(response.status).toBe(200);
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
    expect(recordFailedChargeMock).not.toHaveBeenCalled();
    expect(recordAutoCancellationMock).not.toHaveBeenCalled();
  });

  it("returns 500 when re-fetching the preapproval from Mercado Pago fails", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockRejectedValue(new Error("MP down"));

    const response = await POST(makeRequest({ body: NOTIFICATION_BODY }));

    expect(response.status).toBe(500);
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
  });

  it("acks 200 (idempotent no-op) instead of 500 when the transition is a duplicate/invalid one already applied", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "canceled",
      summarized: null,
    });
    recordAutoCancellationMock.mockRejectedValue(
      new InvalidMembershipTransitionError("CANCELLED", "CANCELLED"),
    );

    const response = await POST(makeRequest({ body: NOTIFICATION_BODY }));

    expect(response.status).toBe(200);
  });

  it("returns 500 (so Mercado Pago retries) on a genuine, non-transition-related failure", async () => {
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue({
      clubId: "club_1",
    });
    getMembershipPreapprovalMock.mockResolvedValue({
      id: "preap_1",
      status: "authorized",
      summarized: null,
    });
    recordSuccessfulChargeMock.mockRejectedValue(
      new Error("DB connection lost"),
    );

    const response = await POST(makeRequest({ body: NOTIFICATION_BODY }));

    expect(response.status).toBe(500);
  });

  it("acks without erroring when the JSON body is malformed but the topic/data.id can still be resolved from query params", async () => {
    verifyMercadoPagoSignatureMock.mockReturnValue(true);
    findMembershipSubscriptionByPreapprovalIdMock.mockResolvedValue(null);

    const url = new URL(
      "http://localhost/api/webhooks/mercadopago/membership?type=subscription_preapproval&data.id=preap_2",
    );
    const headers = new Headers({
      "x-signature": "ts=1,v1=abc",
      "x-request-id": "req-1",
    });
    const request = new NextRequest(url, { method: "POST", headers });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(findMembershipSubscriptionByPreapprovalIdMock).toHaveBeenCalledWith(
      "preap_2",
    );
  });
});

// ANNUAL membership billing is a one-time Checkout Pro payment, never a
// preapproval (see design.md's "Annual one-time payment" decision) — its
// confirmation arrives as a standard `payment`-topic webhook, resolved via
// the `clubId` query param `createMembershipPreference` already embeds on
// its `notification_url` (see lib/mercadopago/platformPreferences.ts),
// mirroring the reservation webhook's own `reservationId`-query-param
// resolution pattern. Discovered as a genuine coverage gap during Phase 9
// integration verification: the route previously only ever dispatched on
// `MEMBERSHIP_WEBHOOK_TOPIC` ("subscription_preapproval"), so an ANNUAL
// payment's confirmation webhook was silently acked as a no-op and could
// never move a subscription out of PENDING.
describe("POST /api/webhooks/mercadopago/membership — payment topic (ANNUAL)", () => {
  function makePaymentRequest(params: {
    clubId?: string | null;
    dataId?: string | null;
  }) {
    const url = new URL("http://localhost/api/webhooks/mercadopago/membership");
    url.searchParams.set("type", "payment");
    if (params.dataId !== null) {
      url.searchParams.set("data.id", params.dataId ?? "pay_1");
    }
    if (params.clubId !== undefined && params.clubId !== null) {
      url.searchParams.set("clubId", params.clubId);
    }
    const headers = new Headers({
      "x-signature": "ts=1,v1=abc",
      "x-request-id": "req-1",
      "content-type": "application/json",
    });
    return new NextRequest(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "payment.updated",
        data: { id: params.dataId ?? "pay_1" },
        id: "notif_pay_1",
        type: "payment",
      }),
    });
  }

  it("acks without fetching the payment when no clubId query param is present (cannot resolve which club this belongs to)", async () => {
    const response = await POST(makePaymentRequest({ clubId: null }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(getMembershipSubscriptionMock).not.toHaveBeenCalled();
    expect(getMembershipPaymentMock).not.toHaveBeenCalled();
  });

  it("acks without fetching the payment when the club has no membership subscription on record", async () => {
    getMembershipSubscriptionMock.mockResolvedValue(null);

    const response = await POST(makePaymentRequest({ clubId: "club_1" }));

    expect(response.status).toBe(200);
    expect(getMembershipSubscriptionMock).toHaveBeenCalledWith("club_1");
    expect(getMembershipPaymentMock).not.toHaveBeenCalled();
  });

  it("rejects with a 400 when the re-fetched payment's external_reference does not match the resolved clubId", async () => {
    getMembershipSubscriptionMock.mockResolvedValue({ clubId: "club_1" });
    getMembershipPaymentMock.mockResolvedValue({
      id: 1,
      status: "approved",
      externalReference: "some_other_club",
    });

    const response = await POST(makePaymentRequest({ clubId: "club_1" }));

    expect(response.status).toBe(400);
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
  });

  it("calls recordSuccessfulCharge for an approved payment matching the resolved club", async () => {
    getMembershipSubscriptionMock.mockResolvedValue({ clubId: "club_1" });
    getMembershipPaymentMock.mockResolvedValue({
      id: 1,
      status: "approved",
      externalReference: "club_1",
    });
    recordSuccessfulChargeMock.mockResolvedValue({});

    const response = await POST(
      makePaymentRequest({ clubId: "club_1", dataId: "pay_1" }),
    );

    expect(response.status).toBe(200);
    expect(getMembershipPaymentMock).toHaveBeenCalledWith("pay_1");
    expect(recordSuccessfulChargeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_1",
        webhookEventId: "notif_pay_1",
      }),
    );
  });

  it("does nothing (still acks 200) for a non-approved payment status (pending/rejected/etc.)", async () => {
    getMembershipSubscriptionMock.mockResolvedValue({ clubId: "club_1" });
    getMembershipPaymentMock.mockResolvedValue({
      id: 1,
      status: "rejected",
      externalReference: "club_1",
    });

    const response = await POST(makePaymentRequest({ clubId: "club_1" }));

    expect(response.status).toBe(200);
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
  });

  it("returns 500 when re-fetching the payment from Mercado Pago fails", async () => {
    getMembershipSubscriptionMock.mockResolvedValue({ clubId: "club_1" });
    getMembershipPaymentMock.mockRejectedValue(new Error("MP down"));

    const response = await POST(makePaymentRequest({ clubId: "club_1" }));

    expect(response.status).toBe(500);
    expect(recordSuccessfulChargeMock).not.toHaveBeenCalled();
  });

  it("acks 200 (idempotent no-op) instead of 500 when recordSuccessfulCharge rejects a duplicate/invalid transition", async () => {
    getMembershipSubscriptionMock.mockResolvedValue({ clubId: "club_1" });
    getMembershipPaymentMock.mockResolvedValue({
      id: 1,
      status: "approved",
      externalReference: "club_1",
    });
    recordSuccessfulChargeMock.mockRejectedValue(
      new InvalidMembershipTransitionError("ACTIVE", "ACTIVE"),
    );

    const response = await POST(makePaymentRequest({ clubId: "club_1" }));

    expect(response.status).toBe(200);
  });

  it("never resolves via findMembershipSubscriptionByPreapprovalId for a payment-topic notification", async () => {
    getMembershipSubscriptionMock.mockResolvedValue({ clubId: "club_1" });
    getMembershipPaymentMock.mockResolvedValue({
      id: 1,
      status: "approved",
      externalReference: "club_1",
    });
    recordSuccessfulChargeMock.mockResolvedValue({});

    await POST(makePaymentRequest({ clubId: "club_1" }));

    expect(
      findMembershipSubscriptionByPreapprovalIdMock,
    ).not.toHaveBeenCalled();
    expect(getMembershipPreapprovalMock).not.toHaveBeenCalled();
  });
});
