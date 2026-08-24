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
  it("requires ACTIVE status and a CONNECTED Mercado Pago account", () => {
    expect(CLUB_OPERATIONAL_WHERE).toEqual({
      status: "ACTIVE",
      mercadoPagoAccount: { status: "CONNECTED" },
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
      mercadoPagoAccount: { status: "CONNECTED" },
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({ operational: true, cause: null });
  });

  it("reports MP_NOT_CONNECTED when the club is ACTIVE but has no MP account", async () => {
    findUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      mercadoPagoAccount: null,
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({ operational: false, cause: "MP_NOT_CONNECTED" });
  });

  it("reports MP_NOT_CONNECTED when the club's MP account status is NOT_CONNECTED", async () => {
    findUniqueMock.mockResolvedValue({
      status: "ACTIVE",
      mercadoPagoAccount: { status: "NOT_CONNECTED" },
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({ operational: false, cause: "MP_NOT_CONNECTED" });
  });

  it("reports CLUB_INACTIVE when MP is connected but the club status is not ACTIVE", async () => {
    findUniqueMock.mockResolvedValue({
      status: "SUSPENDED",
      mercadoPagoAccount: { status: "CONNECTED" },
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({ operational: false, cause: "CLUB_INACTIVE" });
  });

  it("prefers MP_NOT_CONNECTED when both causes apply simultaneously", async () => {
    findUniqueMock.mockResolvedValue({
      status: "INACTIVE",
      mercadoPagoAccount: null,
    });

    const result = await getClubOperationalStatus("club_1");

    expect(result).toEqual({ operational: false, cause: "MP_NOT_CONNECTED" });
  });

  it("reports MP_NOT_CONNECTED when the club itself cannot be found", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await getClubOperationalStatus("club_missing");

    expect(result).toEqual({ operational: false, cause: "MP_NOT_CONNECTED" });
  });
});
