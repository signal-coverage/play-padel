import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  userFindManyMock,
  userFindUniqueMock,
  reservationPartnerCreateManyMock,
  reservationCountMock,
  reservationFindFirstMock,
} = vi.hoisted(() => ({
  userFindManyMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  reservationPartnerCreateManyMock: vi.fn(),
  reservationCountMock: vi.fn(),
  reservationFindFirstMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    userProfile: {
      findMany: userFindManyMock,
      findUnique: userFindUniqueMock,
    },
    reservationPartner: {
      createMany: reservationPartnerCreateManyMock,
    },
    reservation: {
      count: reservationCountMock,
      findFirst: reservationFindFirstMock,
    },
  },
}));

import {
  validatePartnerIds,
  tagReservationPartners,
  countTimesPlayedTogether,
  getLatestPartnerForPlayer,
} from "@/core/reservations/services/reservationPartners.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validatePartnerIds", () => {
  it("returns an empty array when partnerIds is undefined", async () => {
    const result = await validatePartnerIds("booker_1", undefined);
    expect(result).toEqual([]);
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("returns an empty array when partnerIds is an empty array", async () => {
    const result = await validatePartnerIds("booker_1", []);
    expect(result).toEqual([]);
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("throws when more than 3 partner ids are given", async () => {
    await expect(
      validatePartnerIds("booker_1", ["p1", "p2", "p3", "p4"]),
    ).rejects.toThrow("at most 3");
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("throws when the booker tries to tag themselves", async () => {
    await expect(
      validatePartnerIds("booker_1", ["p1", "booker_1"]),
    ).rejects.toThrow("tag yourself");
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("throws when a tagged id doesn't correspond to a real player", async () => {
    userFindManyMock.mockResolvedValue([{ id: "p1" }]);

    await expect(validatePartnerIds("booker_1", ["p1", "p2"])).rejects.toThrow(
      "could not be found",
    );
  });

  it("dedupes and returns the unique valid ids", async () => {
    userFindManyMock.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);

    const result = await validatePartnerIds("booker_1", ["p1", "p2", "p1"]);

    expect(result.sort()).toEqual(["p1", "p2"]);
    expect(userFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: expect.arrayContaining(["p1", "p2"]) } },
      }),
    );
  });
});

describe("tagReservationPartners", () => {
  it("does nothing when partnerIds is empty", async () => {
    await tagReservationPartners("res_1", []);
    expect(reservationPartnerCreateManyMock).not.toHaveBeenCalled();
  });

  it("creates one ReservationPartner row per id, skipping duplicates", async () => {
    reservationPartnerCreateManyMock.mockResolvedValue({ count: 2 });

    await tagReservationPartners("res_1", ["p1", "p2"]);

    expect(reservationPartnerCreateManyMock).toHaveBeenCalledWith({
      data: [
        { reservationId: "res_1", playerId: "p1" },
        { reservationId: "res_1", playerId: "p2" },
      ],
      skipDuplicates: true,
    });
  });

  it("swallows a DB failure instead of throwing (best-effort side effect)", async () => {
    reservationPartnerCreateManyMock.mockRejectedValue(new Error("db down"));

    await expect(
      tagReservationPartners("res_1", ["p1"]),
    ).resolves.toBeUndefined();
  });
});

describe("countTimesPlayedTogether", () => {
  it("counts reservations where either player booked and tagged the other, restricted to eligible statuses", async () => {
    reservationCountMock.mockResolvedValue(4);

    const result = await countTimesPlayedTogether("a", "b");

    expect(result).toBe(4);
    expect(reservationCountMock).toHaveBeenCalledWith({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        OR: [
          { userId: "a", partners: { some: { playerId: "b" } } },
          { userId: "b", partners: { some: { playerId: "a" } } },
        ],
      },
    });
  });
});

describe("getLatestPartnerForPlayer", () => {
  it("returns null when the player has no qualifying reservation", async () => {
    reservationFindFirstMock.mockResolvedValue(null);

    const result = await getLatestPartnerForPlayer("player_1");

    expect(result).toBeNull();
  });

  it("when the player is the booker with a single tagged partner, returns that partner", async () => {
    reservationFindFirstMock.mockResolvedValue({
      id: "res_1",
      userId: "player_1",
      scheduledStart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      partners: [{ playerId: "partner_1" }],
    });
    reservationCountMock.mockResolvedValue(5);
    userFindUniqueMock.mockResolvedValue({
      id: "partner_1",
      displayName: "Sofía Martínez",
      photoURL: null,
      padelCategory: 3,
      preferredSide: "backhand",
      dominantHand: "right",
      email: "sofia@example.com",
      phone: "+54 9 11 5555-0123",
    });

    const result = await getLatestPartnerForPlayer("player_1");

    expect(result).toMatchObject({
      id: "partner_1",
      name: "Sofía Martínez",
      timesPlayedTogether: 5,
      padelCategory: 3,
      preferredSide: "backhand",
      dominantHand: "right",
      email: "sofia@example.com",
      phone: "+54 9 11 5555-0123",
    });
    expect(result?.lastPlayedLabel).toEqual(expect.any(String));
  });

  it("when the player is the booker with multiple tagged partners, picks the one with the highest historical times-played-together", async () => {
    reservationFindFirstMock.mockResolvedValue({
      id: "res_1",
      userId: "player_1",
      scheduledStart: new Date(),
      partners: [{ playerId: "partner_a" }, { playerId: "partner_b" }],
    });
    reservationCountMock.mockImplementation(({ where }) => {
      const other = where.OR[0].partners.some.playerId;
      return Promise.resolve(other === "partner_b" ? 7 : 2);
    });
    userFindUniqueMock.mockResolvedValue({
      id: "partner_b",
      displayName: "Partner B",
      photoURL: null,
      padelCategory: null,
      preferredSide: null,
      dominantHand: null,
      email: "b@example.com",
      phone: null,
    });

    const result = await getLatestPartnerForPlayer("player_1");

    expect(result?.id).toBe("partner_b");
    expect(userFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "partner_b" } }),
    );
  });

  it("when the player is a tagged partner (not the booker), the candidate is the booker", async () => {
    reservationFindFirstMock.mockResolvedValue({
      id: "res_1",
      userId: "booker_x",
      scheduledStart: new Date(),
      partners: [{ playerId: "player_1" }],
    });
    reservationCountMock.mockResolvedValue(1);
    userFindUniqueMock.mockResolvedValue({
      id: "booker_x",
      displayName: "Booker X",
      photoURL: null,
      padelCategory: null,
      preferredSide: null,
      dominantHand: null,
      email: "x@example.com",
      phone: null,
    });

    const result = await getLatestPartnerForPlayer("player_1");

    expect(result?.id).toBe("booker_x");
  });
});
