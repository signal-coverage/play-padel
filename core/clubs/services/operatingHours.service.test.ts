import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    clubOperatingHours: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/infrastructure/db/client";
import {
  getClubOperatingHours,
  setClubOperatingHours,
  resolveDefaultCourtAvailability,
} from "./operatingHours.service";

const findManyMock = prisma.clubOperatingHours.findMany as ReturnType<
  typeof vi.fn
>;
const deleteManyMock = prisma.clubOperatingHours.deleteMany as ReturnType<
  typeof vi.fn
>;
const createManyMock = prisma.clubOperatingHours.createMany as ReturnType<
  typeof vi.fn
>;
const transactionMock = prisma.$transaction as ReturnType<typeof vi.fn>;

const ROW = {
  id: "coh_1",
  clubId: "club_1",
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "21:00",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  findManyMock.mockReset();
  deleteManyMock.mockReset();
  createManyMock.mockReset();
  transactionMock.mockReset();
});

describe("getClubOperatingHours", () => {
  it("returns the club's rows mapped to plain entries", async () => {
    findManyMock.mockResolvedValue([ROW]);

    const result = await getClubOperatingHours("club_1");

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: "club_1" } }),
    );
    expect(result).toEqual([
      { dayOfWeek: 1, startTime: "09:00", endTime: "21:00" },
    ]);
  });

  it("returns an empty array when the club has no rows on file", async () => {
    findManyMock.mockResolvedValue([]);

    const result = await getClubOperatingHours("club_1");

    expect(result).toEqual([]);
  });
});

describe("setClubOperatingHours", () => {
  it("deletes existing rows then recreates the new set inside a transaction", async () => {
    const entries = [
      { dayOfWeek: 1, startTime: "09:00", endTime: "21:00" },
      { dayOfWeek: 2, startTime: "09:00", endTime: "21:00" },
    ];

    transactionMock.mockImplementation(async (callback) => {
      const tx = {
        clubOperatingHours: {
          deleteMany: deleteManyMock,
          createMany: createManyMock,
          findMany: findManyMock,
        },
      };
      return callback(tx);
    });
    deleteManyMock.mockResolvedValue({ count: 0 });
    createManyMock.mockResolvedValue({ count: 2 });
    findManyMock.mockResolvedValue(
      entries.map((e, i) => ({ ...ROW, id: `coh_${i}`, ...e })),
    );

    const result = await setClubOperatingHours("club_1", entries);

    expect(transactionMock).toHaveBeenCalled();
    const deleteOrder = deleteManyMock.mock.invocationCallOrder[0];
    const createOrder = createManyMock.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
    });
    expect(createManyMock).toHaveBeenCalledWith({
      data: entries.map((e) => ({ clubId: "club_1", ...e })),
    });
    expect(result).toEqual(entries);
  });

  it("is a safe no-op recreate when given an empty array (deletes existing rows, creates nothing)", async () => {
    transactionMock.mockImplementation(async (callback) => {
      const tx = {
        clubOperatingHours: {
          deleteMany: deleteManyMock,
          createMany: createManyMock,
          findMany: findManyMock,
        },
      };
      return callback(tx);
    });
    deleteManyMock.mockResolvedValue({ count: 3 });

    const result = await setClubOperatingHours("club_1", []);

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { clubId: "club_1" },
    });
    expect(createManyMock).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

describe("resolveDefaultCourtAvailability", () => {
  it("returns the club's own operating-hours rows when it has any on file", async () => {
    findManyMock.mockResolvedValue([ROW]);

    const result = await resolveDefaultCourtAvailability("club_1");

    expect(result).toEqual([
      { dayOfWeek: 1, startTime: "09:00", endTime: "21:00" },
    ]);
  });

  it("falls back to the literal all-week, all-day default when the club has no operating-hours rows on file", async () => {
    findManyMock.mockResolvedValue([]);

    const result = await resolveDefaultCourtAvailability("club_1");

    expect(result).toHaveLength(7);
    expect(result).toEqual(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        startTime: "00:00",
        endTime: "23:59",
      })),
    );
  });
});
