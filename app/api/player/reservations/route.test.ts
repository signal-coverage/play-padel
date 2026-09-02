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
}));

import { auth } from "@clerk/nextjs/server";
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
import { getClubOperationalStatus } from "@/lib/mercadopago/operationalStatus";
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

  authMock.mockResolvedValue({ userId: "user_1" });
  getCourtByIdMock.mockResolvedValue(COURT);
  getClubByIdMock.mockResolvedValue(CLUB);
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
