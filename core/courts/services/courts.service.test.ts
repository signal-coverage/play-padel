import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    court: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    courtAvailability: {
      createMany: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/core/clubs/services/operatingHours.service", () => ({
  resolveDefaultCourtAvailability: vi.fn(),
}));

import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { resolveDefaultCourtAvailability } from "@/core/clubs/services/operatingHours.service";
import {
  createCourt,
  updateCourt,
  DuplicateCourtNameError,
} from "./courts.service";

// Real shape verified against the actual dev database (Postgres 23505
// unique_violation via the "courts_no_duplicate_active_name" partial unique
// index, Prisma 7.9.1 + @prisma/adapter-neon) — not guessed. Unlike the
// reservations EXCLUDE constraint, Prisma recognizes this one natively as
// its own P2002 code.
function makeDuplicateNameViolationError() {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed on the constraint: `courts_no_duplicate_active_name`",
    {
      code: "P2002",
      clientVersion: "7.9.1",
      meta: { modelName: "Court" },
    },
  );
}

const findFirstMock = prisma.court.findFirst as ReturnType<typeof vi.fn>;
const createMock = prisma.court.create as ReturnType<typeof vi.fn>;
const updateMock = prisma.court.update as ReturnType<typeof vi.fn>;
const createAvailabilityManyMock = prisma.courtAvailability
  .createMany as ReturnType<typeof vi.fn>;
const findUniqueUserMock = prisma.userProfile.findUnique as ReturnType<
  typeof vi.fn
>;
const resolveDefaultCourtAvailabilityMock =
  resolveDefaultCourtAvailability as ReturnType<typeof vi.fn>;

const COURT_ROW = {
  id: "court_1",
  clubId: "club_1",
  name: "Court 1",
  surface: null,
  indoor: false,
  color: null,
  wallType: null,
  lighting: false,
  netType: null,
  photoUrl: null,
  slotDurationMinutes: 90,
  reservationFee: null,
  courtPrice: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: "user_1",
  updatedBy: "user_1",
  deletedAt: null,
  deletedBy: null,
};

beforeEach(() => {
  findFirstMock.mockReset();
  createMock.mockReset();
  updateMock.mockReset();
  createAvailabilityManyMock.mockReset();
  findUniqueUserMock.mockReset();
  findUniqueUserMock.mockResolvedValue({ displayName: "Owner Test" });
  resolveDefaultCourtAvailabilityMock.mockReset();
  // Sane default for tests that create a court without asserting anything
  // about availability seeding — individual seeding tests override this.
  resolveDefaultCourtAvailabilityMock.mockResolvedValue([]);
});

describe("createCourt — duplicate name guard", () => {
  it("rejects a name already used by another non-deleted court in the same club", async () => {
    findFirstMock.mockResolvedValue({ id: "court_existing" });

    await expect(
      createCourt("club_1", { name: "Court 1" }, "user_1"),
    ).rejects.toThrow(DuplicateCourtNameError);

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clubId: "club_1",
          deletedAt: null,
          name: { equals: "Court 1", mode: "insensitive" },
        }),
      }),
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it("is case-insensitive", async () => {
    findFirstMock.mockResolvedValue({ id: "court_existing" });

    await expect(
      createCourt("club_1", { name: "court 1" }, "user_1"),
    ).rejects.toThrow(DuplicateCourtNameError);
  });

  it("does not collide with a soft-deleted court's name", async () => {
    // findFirst itself already scopes deletedAt: null — a real Prisma call
    // would simply never return a soft-deleted row, so returning null here
    // exercises the same "no live conflict" path.
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue(COURT_ROW);

    await expect(
      createCourt("club_1", { name: "Court 1" }, "user_1"),
    ).resolves.toBeTruthy();
    expect(createMock).toHaveBeenCalled();
  });

  it("allows the same name in a different club", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue(COURT_ROW);

    await expect(
      createCourt("club_2", { name: "Court 1" }, "user_1"),
    ).resolves.toBeTruthy();

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clubId: "club_2" }),
      }),
    );
  });

  it("translates a real DB-level unique-constraint violation into DuplicateCourtNameError, even when the pre-check found no conflict (race window)", async () => {
    // Two concurrent createCourt calls for the same club/name can both pass
    // assertNoDuplicateCourtName's own findFirst check before either write
    // lands — the DB-level unique index (migration 20260906020000) is the
    // real backstop.
    findFirstMock.mockResolvedValue(null);
    createMock.mockRejectedValue(makeDuplicateNameViolationError());

    await expect(
      createCourt("club_1", { name: "Court 1" }, "user_1"),
    ).rejects.toThrow(DuplicateCourtNameError);
  });

  it("rethrows an unrelated database error unchanged (not misclassified as a duplicate name)", async () => {
    findFirstMock.mockResolvedValue(null);
    const unrelatedError = new Error("connection terminated unexpectedly");
    createMock.mockRejectedValue(unrelatedError);

    await expect(
      createCourt("club_1", { name: "Court 1" }, "user_1"),
    ).rejects.toThrow("connection terminated unexpectedly");
  });
});

describe("createCourt — availability seeding", () => {
  it("seeds CourtAvailability from input.availability when provided", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue(COURT_ROW);
    createAvailabilityManyMock.mockResolvedValue({ count: 1 });

    const availability = [
      { dayOfWeek: 1, startTime: "08:00", endTime: "20:00" },
    ];

    await createCourt("club_1", { name: "Court 1", availability }, "user_1");

    expect(resolveDefaultCourtAvailabilityMock).not.toHaveBeenCalled();
    expect(createAvailabilityManyMock).toHaveBeenCalledWith({
      data: [
        {
          courtId: COURT_ROW.id,
          dayOfWeek: 1,
          startTime: "08:00",
          endTime: "20:00",
        },
      ],
    });
  });

  it("seeds from resolveDefaultCourtAvailability when input.availability is omitted", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue(COURT_ROW);
    createAvailabilityManyMock.mockResolvedValue({ count: 1 });
    resolveDefaultCourtAvailabilityMock.mockResolvedValue([
      { dayOfWeek: 2, startTime: "00:00", endTime: "23:59" },
    ]);

    await createCourt("club_1", { name: "Court 1" }, "user_1");

    expect(resolveDefaultCourtAvailabilityMock).toHaveBeenCalledWith("club_1");
    expect(createAvailabilityManyMock).toHaveBeenCalledWith({
      data: [
        {
          courtId: COURT_ROW.id,
          dayOfWeek: 2,
          startTime: "00:00",
          endTime: "23:59",
        },
      ],
    });
  });

  it("seeds from resolveDefaultCourtAvailability when input.availability is an empty array", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue(COURT_ROW);
    createAvailabilityManyMock.mockResolvedValue({ count: 1 });
    resolveDefaultCourtAvailabilityMock.mockResolvedValue([
      { dayOfWeek: 3, startTime: "00:00", endTime: "23:59" },
    ]);

    await createCourt(
      "club_1",
      { name: "Court 1", availability: [] },
      "user_1",
    );

    expect(resolveDefaultCourtAvailabilityMock).toHaveBeenCalledWith("club_1");
    expect(createAvailabilityManyMock).toHaveBeenCalled();
  });
});

describe("createCourt — physical characteristics", () => {
  it("passes wallType, lighting, and netType through to the created row", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      ...COURT_ROW,
      wallType: "blindex",
      lighting: true,
      netType: "professional",
    });
    createAvailabilityManyMock.mockResolvedValue({ count: 0 });
    resolveDefaultCourtAvailabilityMock.mockResolvedValue([]);

    const court = await createCourt(
      "club_1",
      {
        name: "Court 1",
        wallType: "blindex",
        lighting: true,
        netType: "professional",
      },
      "user_1",
    );

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          wallType: "blindex",
          lighting: true,
          netType: "professional",
        }),
      }),
    );
    expect(court.wallType).toBe("blindex");
    expect(court.lighting).toBe(true);
    expect(court.netType).toBe("professional");
  });

  it("defaults wallType/netType to null and lighting to false when omitted", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue(COURT_ROW);
    createAvailabilityManyMock.mockResolvedValue({ count: 0 });
    resolveDefaultCourtAvailabilityMock.mockResolvedValue([]);

    await createCourt("club_1", { name: "Court 1" }, "user_1");

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          wallType: null,
          lighting: false,
          netType: null,
        }),
      }),
    );
  });
});

describe("updateCourt — physical characteristics", () => {
  it("threads wallType, lighting, and netType into the update payload", async () => {
    updateMock.mockResolvedValue({
      ...COURT_ROW,
      wallType: "concrete",
      lighting: true,
      netType: "standard",
    });

    const court = await updateCourt(
      "club_1",
      "court_1",
      { wallType: "concrete", lighting: true, netType: "standard" },
      "user_1",
    );

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          wallType: "concrete",
          lighting: true,
          netType: "standard",
        }),
      }),
    );
    expect(court.wallType).toBe("concrete");
    expect(court.lighting).toBe(true);
    expect(court.netType).toBe("standard");
  });

  it("omits wallType/lighting/netType from the update payload when not provided", async () => {
    updateMock.mockResolvedValue(COURT_ROW);

    await updateCourt("club_1", "court_1", { name: "Court 1" }, "user_1");

    const dataArg = updateMock.mock.calls[0][0].data;
    expect(dataArg).not.toHaveProperty("wallType");
    expect(dataArg).not.toHaveProperty("lighting");
    expect(dataArg).not.toHaveProperty("netType");
  });
});

describe("updateCourt — duplicate name guard", () => {
  it("rejects renaming to a name already used by another court in the same club", async () => {
    findFirstMock.mockResolvedValue({ id: "court_other" });

    await expect(
      updateCourt("club_1", "court_1", { name: "Court 2" }, "user_1"),
    ).rejects.toThrow(DuplicateCourtNameError);

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clubId: "club_1",
          deletedAt: null,
          name: { equals: "Court 2", mode: "insensitive" },
          id: { not: "court_1" },
        }),
      }),
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("allows keeping the court's own current name (self-exclusion)", async () => {
    // The court being edited is excluded from the lookup (id: { not }), so a
    // real Prisma call would simply never match itself — null mirrors that.
    findFirstMock.mockResolvedValue(null);
    updateMock.mockResolvedValue(COURT_ROW);

    await expect(
      updateCourt("club_1", "court_1", { name: "Court 1" }, "user_1"),
    ).resolves.toBeTruthy();
    expect(updateMock).toHaveBeenCalled();
  });

  it("translates a real DB-level unique-constraint violation into DuplicateCourtNameError, even when the pre-check found no conflict (race window)", async () => {
    findFirstMock.mockResolvedValue(null);
    updateMock.mockRejectedValue(makeDuplicateNameViolationError());

    await expect(
      updateCourt("club_1", "court_1", { name: "Court 2" }, "user_1"),
    ).rejects.toThrow(DuplicateCourtNameError);
  });

  it("rethrows an unrelated database error unchanged (not misclassified as a duplicate name)", async () => {
    findFirstMock.mockResolvedValue(null);
    const unrelatedError = new Error("connection terminated unexpectedly");
    updateMock.mockRejectedValue(unrelatedError);

    await expect(
      updateCourt("club_1", "court_1", { name: "Court 2" }, "user_1"),
    ).rejects.toThrow("connection terminated unexpectedly");
  });

  it("skips the duplicate check entirely when name isn't part of the update", async () => {
    updateMock.mockResolvedValue(COURT_ROW);

    await updateCourt("club_1", "court_1", { active: false }, "user_1");

    expect(findFirstMock).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalled();
  });
});
