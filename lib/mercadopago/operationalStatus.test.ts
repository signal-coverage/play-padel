import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    club: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/db/client";
import {
  getClubOperationalStatus,
  CLUB_OPERATIONAL_WHERE,
  getAvailablePaymentMethods,
  getAvailablePaymentMethodsForClubs,
} from "./operationalStatus";

const findUniqueMock = prisma.club.findUnique as ReturnType<typeof vi.fn>;
const findManyMock = prisma.club.findMany as ReturnType<typeof vi.fn>;

describe("CLUB_OPERATIONAL_WHERE", () => {
  it("requires ACTIVE status AND (a CONNECTED Mercado Pago account OR a configured bank transfer account)", () => {
    expect(CLUB_OPERATIONAL_WHERE).toEqual({
      status: "ACTIVE",
      OR: [
        { mercadoPagoAccount: { status: "CONNECTED" } },
        { bankTransferAccount: { isNot: null } },
      ],
    });
  });
});

describe("getClubOperationalStatus", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("reports operational when the club is ACTIVE and MP-connected", async () => {
    findUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      mercadoPagoAccount: {
        status: "CONNECTED",
        mpEmail: "owner@club.com",
        mpNickname: "clubowner",
      },
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: true,
      cause: null,
      email: "owner@club.com",
      nickname: "clubowner",
    });
  });

  it("reports MP_NOT_CONNECTED when the club is ACTIVE but has no MP account", async () => {
    findUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      mercadoPagoAccount: null,
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: false,
      cause: "MP_NOT_CONNECTED",
      email: null,
      nickname: null,
    });
  });

  it("reports MP_NOT_CONNECTED when the club's MP account status is NOT_CONNECTED", async () => {
    findUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      mercadoPagoAccount: {
        status: "NOT_CONNECTED",
        mpEmail: null,
        mpNickname: null,
      },
      bankTransferAccount: null,
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: false,
      cause: "MP_NOT_CONNECTED",
      email: null,
      nickname: null,
    });
  });

  it("reports operational when MP is NOT connected but a bank transfer account is configured", async () => {
    findUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      mercadoPagoAccount: null,
      bankTransferAccount: { id: "cbta_1" },
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: true,
      cause: null,
      email: null,
      nickname: null,
    });
  });

  it("still reports operational when MP is connected and there is no bank transfer account (existing behavior unchanged)", async () => {
    findUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      mercadoPagoAccount: {
        status: "CONNECTED",
        mpEmail: "owner@club.com",
        mpNickname: "clubowner",
      },
      bankTransferAccount: null,
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: true,
      cause: null,
      email: "owner@club.com",
      nickname: "clubowner",
    });
  });

  it("reports MP_NOT_CONNECTED when the club has NEITHER a connected MP account NOR a bank transfer account", async () => {
    findUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      mercadoPagoAccount: null,
      bankTransferAccount: null,
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: false,
      cause: "MP_NOT_CONNECTED",
      email: null,
      nickname: null,
    });
  });

  it("reports CLUB_INACTIVE when MP is connected but the club status is not ACTIVE", async () => {
    findUniqueMock.mockResolvedValue({
      status: "SUSPENDED",
      approvalStatus: "APPROVED",
      mercadoPagoAccount: {
        status: "CONNECTED",
        mpEmail: "owner@club.com",
        mpNickname: "clubowner",
      },
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: false,
      cause: "CLUB_INACTIVE",
      email: "owner@club.com",
      nickname: "clubowner",
    });
  });

  it("prefers MP_NOT_CONNECTED when both causes apply simultaneously", async () => {
    findUniqueMock.mockResolvedValue({
      status: "INACTIVE",
      approvalStatus: "APPROVED",
      mercadoPagoAccount: null,
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: false,
      cause: "MP_NOT_CONNECTED",
      email: null,
      nickname: null,
    });
  });

  it("reports MP_NOT_CONNECTED when the club itself cannot be found", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await getClubOperationalStatus("club_missing");

    expect(result).toEqual({
      operational: false,
      cause: "MP_NOT_CONNECTED",
      email: null,
      nickname: null,
    });
  });

  // Admin approval queue gate — see prisma/schema.prisma's
  // Club.approvalStatus and app/api/onboarding/route.ts. Checked FIRST, ahead
  // of both the payout-method check and the CLUB_INACTIVE check, since a
  // club an admin hasn't approved yet must never accept real reservations
  // regardless of whatever else is configured.
  it("reports PENDING_APPROVAL when the club's approvalStatus is PENDING, regardless of an otherwise-fully-configured payout method and ACTIVE status", async () => {
    findUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      approvalStatus: "PENDING",
      mercadoPagoAccount: {
        status: "CONNECTED",
        mpEmail: "owner@club.com",
        mpNickname: "clubowner",
      },
      bankTransferAccount: { id: "cbta_1" },
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: false,
      cause: "PENDING_APPROVAL",
      email: null,
      nickname: null,
    });
  });

  it("reports PENDING_APPROVAL even when the club status is not ACTIVE and it has no payout method at all", async () => {
    findUniqueMock.mockResolvedValue({
      status: "INACTIVE",
      approvalStatus: "PENDING",
      mercadoPagoAccount: null,
      bankTransferAccount: null,
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: false,
      cause: "PENDING_APPROVAL",
      email: null,
      nickname: null,
    });
  });

  // Intentional, documented for now: a REJECTED club hits the exact same
  // cause as a still-PENDING one — the owner-facing UI cannot yet tell the
  // two apart (out of scope, see this change's brief). A future change may
  // split this into its own cause/message.
  it("reports PENDING_APPROVAL when the club's approvalStatus is REJECTED", async () => {
    findUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      approvalStatus: "REJECTED",
      mercadoPagoAccount: {
        status: "CONNECTED",
        mpEmail: "owner@club.com",
        mpNickname: "clubowner",
      },
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({
      operational: false,
      cause: "PENDING_APPROVAL",
      email: null,
      nickname: null,
    });
  });
});

describe("getAvailablePaymentMethods", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
  });

  it("returns only MERCADOPAGO when only MP is connected", async () => {
    findUniqueMock.mockResolvedValue({
      whatsappNumber: null,
      mercadoPagoAccount: { status: "CONNECTED" },
      bankTransferAccount: null,
    });
    const methods = await getAvailablePaymentMethods("club-1");
    expect(methods).toEqual(["MERCADOPAGO"]);
  });

  it("returns only TRANSFER when a bank transfer account and a WhatsApp number are both set", async () => {
    findUniqueMock.mockResolvedValue({
      whatsappNumber: "+54 11 1234-5678",
      mercadoPagoAccount: null,
      bankTransferAccount: { id: "bta-1" },
    });
    const methods = await getAvailablePaymentMethods("club-1");
    expect(methods).toEqual(["TRANSFER"]);
  });

  it("excludes TRANSFER when the bank transfer account exists but no WhatsApp number is set", async () => {
    findUniqueMock.mockResolvedValue({
      whatsappNumber: null,
      mercadoPagoAccount: null,
      bankTransferAccount: { id: "bta-1" },
    });
    const methods = await getAvailablePaymentMethods("club-1");
    expect(methods).toEqual([]);
  });

  it("returns both when MP is connected and transfer is fully configured", async () => {
    findUniqueMock.mockResolvedValue({
      whatsappNumber: "+54 11 1234-5678",
      mercadoPagoAccount: { status: "CONNECTED" },
      bankTransferAccount: { id: "bta-1" },
    });
    const methods = await getAvailablePaymentMethods("club-1");
    expect(methods).toEqual(["MERCADOPAGO", "TRANSFER"]);
  });

  it("returns an empty array when the club doesn't exist", async () => {
    findUniqueMock.mockResolvedValue(null);
    const methods = await getAvailablePaymentMethods("club-missing");
    expect(methods).toEqual([]);
  });
});

describe("getAvailablePaymentMethodsForClubs", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("returns a map keyed by clubId, batched in a single findMany call", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "club-1",
        whatsappNumber: null,
        mercadoPagoAccount: { status: "CONNECTED" },
        bankTransferAccount: null,
      },
      {
        id: "club-2",
        whatsappNumber: "+54 11 1234-5678",
        mercadoPagoAccount: null,
        bankTransferAccount: { id: "bta-2" },
      },
    ]);
    const result = await getAvailablePaymentMethodsForClubs([
      "club-1",
      "club-2",
    ]);
    expect(result.get("club-1")).toEqual(["MERCADOPAGO"]);
    expect(result.get("club-2")).toEqual(["TRANSFER"]);
    expect(findManyMock).toHaveBeenCalledTimes(1);
  });

  it("returns an empty map for an empty input without querying the database", async () => {
    const result = await getAvailablePaymentMethodsForClubs([]);
    expect(result.size).toBe(0);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
