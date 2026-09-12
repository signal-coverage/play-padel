import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/core/reservations/services/reservations.service", () => ({
  listReservationsByUser: vi.fn(),
  createReservation: vi.fn(),
  cancelReservation: vi.fn(),
  canSelfCancel: vi.fn(),
}));

vi.mock("@/core/courts/services/courts.service", () => ({
  getCourtById: vi.fn(),
}));

vi.mock("@/core/clubs/services/clubs.service", () => ({
  getClubById: vi.fn(),
}));

vi.mock("@/core/billing/services/billing.service", () => ({
  createInvoice: vi.fn(),
  issueInvoice: vi.fn(),
  getReservationIdsWithReceipt: vi.fn(),
}));

vi.mock("@/lib/mercadopago/preferences", () => ({
  createCheckoutPreference: vi.fn(),
}));

vi.mock("@/lib/mercadopago/operationalStatus", () => ({
  getClubOperationalStatus: vi.fn(),
  getAvailablePaymentMethods: vi.fn(),
}));

vi.mock("botid/server", () => ({
  checkBotId: vi.fn(),
}));

vi.mock("@vercel/firewall", () => ({
  checkRateLimit: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { checkBotId } from "botid/server";
import { checkRateLimit } from "@vercel/firewall";
import {
  createReservation,
  cancelReservation,
} from "@/core/reservations/services/reservations.service";
import { getCourtById } from "@/core/courts/services/courts.service";
import { getClubById } from "@/core/clubs/services/clubs.service";
import {
  createInvoice,
  issueInvoice,
} from "@/core/billing/services/billing.service";
import { createCheckoutPreference } from "@/lib/mercadopago/preferences";
import {
  getClubOperationalStatus,
  getAvailablePaymentMethods,
} from "@/lib/mercadopago/operationalStatus";
import { POST } from "./route";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const createReservationMock = createReservation as ReturnType<typeof vi.fn>;
const cancelReservationMock = cancelReservation as ReturnType<typeof vi.fn>;
const getCourtByIdMock = getCourtById as ReturnType<typeof vi.fn>;
const getClubByIdMock = getClubById as ReturnType<typeof vi.fn>;
const createInvoiceMock = createInvoice as ReturnType<typeof vi.fn>;
const issueInvoiceMock = issueInvoice as ReturnType<typeof vi.fn>;
const createCheckoutPreferenceMock = createCheckoutPreference as ReturnType<
  typeof vi.fn
>;
const getClubOperationalStatusMock = getClubOperationalStatus as ReturnType<
  typeof vi.fn
>;
const getAvailablePaymentMethodsMock = getAvailablePaymentMethods as ReturnType<
  typeof vi.fn
>;
const checkBotIdMock = checkBotId as unknown as ReturnType<typeof vi.fn>;
const checkRateLimitMock = checkRateLimit as unknown as ReturnType<
  typeof vi.fn
>;

const COURT = {
  id: "court_1",
  clubId: "club_1",
  name: "Court 1",
  reservationFee: 1000,
};

const CLUB = { id: "club_1", currency: "ARS" };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/player/reservations", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  authMock.mockReset();
  createReservationMock.mockReset();
  cancelReservationMock.mockReset();
  getCourtByIdMock.mockReset();
  getClubByIdMock.mockReset();
  createInvoiceMock.mockReset();
  issueInvoiceMock.mockReset();
  createCheckoutPreferenceMock.mockReset();
  getClubOperationalStatusMock.mockReset();
  getAvailablePaymentMethodsMock.mockReset();
  checkBotIdMock.mockReset();
  checkRateLimitMock.mockReset();

  authMock.mockResolvedValue({ userId: "user_1" });
  getCourtByIdMock.mockResolvedValue(COURT);
  getClubByIdMock.mockResolvedValue(CLUB);
  checkBotIdMock.mockResolvedValue({ isBot: false });
  checkRateLimitMock.mockResolvedValue({ rateLimited: false });
  getAvailablePaymentMethodsMock.mockResolvedValue(["MERCADOPAGO", "TRANSFER"]);
});

describe("POST /api/player/reservations — security guards", () => {
  it("returns 403 when BotID classifies the request as a bot", async () => {
    checkBotIdMock.mockResolvedValue({ isBot: true });

    const response = await POST(
      makeRequest({
        courtId: COURT.id,
        scheduledStart: "2026-08-20T10:00:00.000Z",
        scheduledEnd: "2026-08-20T11:00:00.000Z",
      }),
    );

    expect(response.status).toBe(403);
    expect(createReservationMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the shared rate limit is exceeded", async () => {
    checkRateLimitMock.mockResolvedValue({ rateLimited: true });

    const response = await POST(
      makeRequest({
        courtId: COURT.id,
        scheduledStart: "2026-08-20T10:00:00.000Z",
        scheduledEnd: "2026-08-20T11:00:00.000Z",
      }),
    );

    expect(response.status).toBe(429);
    expect(createReservationMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/player/reservations — input validation", () => {
  it("rejects a garbage (non-parseable) scheduledStart with 400, without ever calling createReservation", async () => {
    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "not-a-date",
        scheduledEnd: "2026-09-01T11:00:00Z",
      }),
    );

    expect(response.status).toBe(400);
    expect(createReservationMock).not.toHaveBeenCalled();
    expect(getCourtByIdMock).not.toHaveBeenCalled();
  });

  it("rejects a garbage (non-parseable) scheduledEnd with 400, without ever calling createReservation", async () => {
    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "also-not-a-date",
      }),
    );

    expect(response.status).toBe(400);
    expect(createReservationMock).not.toHaveBeenCalled();
  });

  it("rejects scheduledEnd at or before scheduledStart with 400", async () => {
    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T11:00:00Z",
        scheduledEnd: "2026-09-01T10:00:00Z",
      }),
    );

    expect(response.status).toBe(400);
    expect(createReservationMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/player/reservations — booking-time operational gate", () => {
  it("blocks a paid booking with 422 club_payment_unavailable when the club's MP connection is not operational, before creating any reservation hold", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: false,
      cause: "MP_NOT_CONNECTED",
    });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
        paymentMethod: "MERCADOPAGO",
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "club_payment_unavailable",
    });
    expect(createReservationMock).not.toHaveBeenCalled();
    expect(createCheckoutPreferenceMock).not.toHaveBeenCalled();
  });

  // Admin approval queue gate (see lib/mercadopago/operationalStatus.ts's
  // PENDING_APPROVAL cause) — this route never branches on the specific
  // cause value, so a PENDING/REJECTED club's booking attempt is already
  // covered by the exact same generic non-operational handling as
  // MP_NOT_CONNECTED, with zero route changes required.
  it("blocks a paid booking with 422 club_payment_unavailable when the club is still pending admin approval", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: false,
      cause: "PENDING_APPROVAL",
    });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
        paymentMethod: "MERCADOPAGO",
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "club_payment_unavailable",
    });
    expect(createReservationMock).not.toHaveBeenCalled();
    expect(createCheckoutPreferenceMock).not.toHaveBeenCalled();
  });

  it("proceeds normally and threads the club id through to createCheckoutPreference when the club is operational", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: true,
      cause: null,
    });
    createReservationMock.mockResolvedValue({
      id: "res_1",
      clubId: "club_1",
    });
    createInvoiceMock.mockResolvedValue({ id: "invoice_1" });
    issueInvoiceMock.mockResolvedValue({ id: "invoice_1" });
    createCheckoutPreferenceMock.mockResolvedValue({
      checkoutUrl: "https://mp.example.com/checkout/abc",
    });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
        paymentMethod: "MERCADOPAGO",
      }),
    );

    expect(getClubOperationalStatusMock).toHaveBeenCalledWith("club_1");
    expect(createCheckoutPreferenceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clubId: "club_1",
        reservationId: "res_1",
      }),
    );
    expect(response.status).toBe(201);
  });

  it("does not run the operational gate for a free (fee 0) court booking", async () => {
    getCourtByIdMock.mockResolvedValue({ ...COURT, reservationFee: 0 });
    createReservationMock.mockResolvedValue({ id: "res_free" });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
      }),
    );

    expect(getClubOperationalStatusMock).not.toHaveBeenCalled();
    expect(response.status).toBe(201);
  });

  it("does not run the operational gate when the court has no price set (existing 422 wins)", async () => {
    getCourtByIdMock.mockResolvedValue({
      ...COURT,
      reservationFee: undefined,
    });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
      }),
    );

    expect(response.status).toBe(422);
    expect(getClubOperationalStatusMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/player/reservations — optional partner tagging", () => {
  it("passes partnerIds through to createReservation on a free-court booking", async () => {
    getCourtByIdMock.mockResolvedValue({ ...COURT, reservationFee: 0 });
    createReservationMock.mockResolvedValue({ id: "res_free" });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
        partnerIds: ["partner_1", "partner_2"],
      }),
    );

    expect(response.status).toBe(201);
    expect(createReservationMock).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ partnerIds: ["partner_1", "partner_2"] }),
    );
  });

  it("passes partnerIds through to createReservation on a paid-court booking", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: true,
      cause: null,
    });
    createReservationMock.mockResolvedValue({ id: "res_1", clubId: "club_1" });
    createInvoiceMock.mockResolvedValue({ id: "invoice_1" });
    issueInvoiceMock.mockResolvedValue({ id: "invoice_1" });
    createCheckoutPreferenceMock.mockResolvedValue({
      checkoutUrl: "https://mp.example.com/checkout/abc",
    });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
        partnerIds: ["partner_1"],
        paymentMethod: "MERCADOPAGO",
      }),
    );

    expect(response.status).toBe(201);
    expect(createReservationMock).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ partnerIds: ["partner_1"] }),
      {
        pendingPayment: true,
        holdMinutes: undefined,
        paymentMethod: "MERCADOPAGO",
      },
    );
  });

  it("passes undefined partnerIds through when the field is omitted (no behavior change)", async () => {
    getCourtByIdMock.mockResolvedValue({ ...COURT, reservationFee: 0 });
    createReservationMock.mockResolvedValue({ id: "res_free" });

    await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
      }),
    );

    expect(createReservationMock).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ partnerIds: undefined }),
    );
  });

  it("ignores a non-array partnerIds value instead of throwing", async () => {
    getCourtByIdMock.mockResolvedValue({ ...COURT, reservationFee: 0 });
    createReservationMock.mockResolvedValue({ id: "res_free" });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
        partnerIds: "not-an-array",
      }),
    );

    expect(response.status).toBe(201);
    expect(createReservationMock).toHaveBeenCalledWith(
      "user_1",
      expect.objectContaining({ partnerIds: undefined }),
    );
  });
});

describe("POST /api/player/reservations — payment method selection", () => {
  it("returns 400 when a priced court's booking omits paymentMethod and the club offers 2+ methods", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: true,
      cause: null,
    });
    getAvailablePaymentMethodsMock.mockResolvedValue([
      "MERCADOPAGO",
      "TRANSFER",
    ]);

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
      }),
    );

    expect(response.status).toBe(400);
    expect(createReservationMock).not.toHaveBeenCalled();
  });

  // Rolling-deploy / older-client safety net: a client that doesn't yet know
  // about paymentMethod omits it entirely. When the club only offers one
  // method there's no real ambiguity, so this must succeed exactly like the
  // pre-paymentMethod behavior (always Mercado Pago) instead of hard-400ing.
  it("falls back to the club's single available payment method when paymentMethod is omitted", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: true,
      cause: null,
    });
    getAvailablePaymentMethodsMock.mockResolvedValue(["MERCADOPAGO"]);
    createReservationMock.mockResolvedValue({ id: "res_1", clubId: "club_1" });
    createInvoiceMock.mockResolvedValue({ id: "invoice_1" });
    issueInvoiceMock.mockResolvedValue({ id: "invoice_1" });
    createCheckoutPreferenceMock.mockResolvedValue({
      checkoutUrl: "https://mp.example.com/checkout/abc",
    });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.checkoutUrl).toBe("https://mp.example.com/checkout/abc");
    expect(createReservationMock).toHaveBeenCalledWith(
      "user_1",
      expect.anything(),
      expect.objectContaining({
        pendingPayment: true,
        paymentMethod: "MERCADOPAGO",
      }),
    );
  });

  it("returns 422 when the chosen paymentMethod isn't available for the club", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: true,
      cause: null,
    });
    getAvailablePaymentMethodsMock.mockResolvedValue(["MERCADOPAGO"]);

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
        paymentMethod: "TRANSFER",
      }),
    );

    expect(response.status).toBe(422);
    expect(createReservationMock).not.toHaveBeenCalled();
  });

  it("creates a 60-minute TRANSFER hold and returns no checkoutUrl when paymentMethod is TRANSFER", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: true,
      cause: null,
    });
    getAvailablePaymentMethodsMock.mockResolvedValue([
      "MERCADOPAGO",
      "TRANSFER",
    ]);
    createReservationMock.mockResolvedValue({ id: "res_1", clubId: "club_1" });
    createInvoiceMock.mockResolvedValue({ id: "invoice_1" });
    issueInvoiceMock.mockResolvedValue({ id: "invoice_1" });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
        paymentMethod: "TRANSFER",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.checkoutUrl).toBeUndefined();
    expect(createReservationMock).toHaveBeenCalledWith(
      "user_1",
      expect.anything(),
      expect.objectContaining({
        pendingPayment: true,
        holdMinutes: 60,
        paymentMethod: "TRANSFER",
      }),
    );
    expect(createCheckoutPreferenceMock).not.toHaveBeenCalled();
  });

  it("still creates the standard 15-minute MERCADOPAGO hold and calls createCheckoutPreference when paymentMethod is MERCADOPAGO", async () => {
    getClubOperationalStatusMock.mockResolvedValue({
      operational: true,
      cause: null,
    });
    getAvailablePaymentMethodsMock.mockResolvedValue(["MERCADOPAGO"]);
    createReservationMock.mockResolvedValue({ id: "res_1", clubId: "club_1" });
    createInvoiceMock.mockResolvedValue({ id: "invoice_1" });
    issueInvoiceMock.mockResolvedValue({ id: "invoice_1" });
    createCheckoutPreferenceMock.mockResolvedValue({
      checkoutUrl: "https://mp.example.com/checkout/abc",
    });

    const response = await POST(
      makeRequest({
        courtId: "court_1",
        scheduledStart: "2026-09-01T10:00:00Z",
        scheduledEnd: "2026-09-01T11:00:00Z",
        paymentMethod: "MERCADOPAGO",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.checkoutUrl).toBeDefined();
    expect(createReservationMock).toHaveBeenCalledWith(
      "user_1",
      expect.anything(),
      expect.objectContaining({
        pendingPayment: true,
        paymentMethod: "MERCADOPAGO",
      }),
    );
  });
});
