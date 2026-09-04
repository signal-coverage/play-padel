import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    club: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/db/client";
import {
  getClubOperationalStatus,
  CLUB_OPERATIONAL_WHERE,
} from "./operationalStatus";

const findUniqueMock = prisma.club.findUnique as ReturnType<typeof vi.fn>;

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
});
