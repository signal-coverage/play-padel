import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  tournamentCreateMock,
  tournamentFindManyMock,
  tournamentFindFirstMock,
  tournamentFindUniqueMock,
  tournamentUpdateMock,
  tournamentCategoryCreateManyMock,
  tournamentCategoryFindManyMock,
  tournamentCategoryUpdateManyMock,
  tournamentTeamFindManyMock,
  userFindUniqueMock,
  transactionMock,
} = vi.hoisted(() => ({
  tournamentCreateMock: vi.fn(),
  tournamentFindManyMock: vi.fn(),
  tournamentFindFirstMock: vi.fn(),
  tournamentFindUniqueMock: vi.fn(),
  tournamentUpdateMock: vi.fn(),
  tournamentCategoryCreateManyMock: vi.fn(),
  tournamentCategoryFindManyMock: vi.fn(),
  tournamentCategoryUpdateManyMock: vi.fn(),
  tournamentTeamFindManyMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    tournament: {
      create: tournamentCreateMock,
      findMany: tournamentFindManyMock,
      findFirst: tournamentFindFirstMock,
      findUnique: tournamentFindUniqueMock,
      update: tournamentUpdateMock,
    },
    tournamentCategory: {
      createMany: tournamentCategoryCreateManyMock,
      findMany: tournamentCategoryFindManyMock,
      updateMany: tournamentCategoryUpdateManyMock,
    },
    tournamentTeam: {
      findMany: tournamentTeamFindManyMock,
    },
    userProfile: {
      findUnique: userFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import {
  createTournament,
  listTournamentsForOwner,
  getTournamentDetailForOwner,
  updateTournament,
  publishTournament,
  cancelTournament,
  listOpenTournamentsForPlayer,
  getTournamentDetailForPlayer,
} from "./tournaments.service";

beforeEach(() => {
  vi.clearAllMocks();
  userFindUniqueMock.mockResolvedValue({ displayName: "Owner" });
});

const NOW = new Date("2026-06-01T12:00:00.000Z");

const TOURNAMENT_ROW = {
  id: "tourney_1",
  clubId: "club_1",
  name: "Summer Open",
  description: null,
  status: "DRAFT",
  registrationOpensAt: new Date("2026-06-01T00:00:00.000Z"),
  registrationClosesAt: new Date("2026-06-10T00:00:00.000Z"),
  publishedAt: null,
  startDate: null,
  endDate: null,
  createdAt: NOW,
  updatedAt: NOW,
  createdBy: "owner_1",
  updatedBy: "owner_1",
};

const CATEGORY_ROW = {
  id: "cat_1",
  tournamentId: "tourney_1",
  name: "Category A",
  status: "DRAFT",
  minCategoryLevel: null,
  maxCategoryLevel: null,
  groupCount: 2,
  advancesPerGroup: 2,
  maxTeams: null,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("createTournament", () => {
  it("creates the tournament and its categories inside one transaction", async () => {
    transactionMock.mockImplementation(async (callback) => {
      const tx = {
        tournament: { create: tournamentCreateMock },
        tournamentCategory: {
          createMany: tournamentCategoryCreateManyMock,
          findMany: tournamentCategoryFindManyMock,
        },
      };
      return callback(tx);
    });
    tournamentCreateMock.mockResolvedValue(TOURNAMENT_ROW);
    tournamentCategoryCreateManyMock.mockResolvedValue({ count: 1 });
    tournamentCategoryFindManyMock.mockResolvedValue([CATEGORY_ROW]);

    const result = await createTournament(
      "club_1",
      {
        name: "Summer Open",
        registrationOpensAt: "2026-06-01T00:00:00.000Z",
        registrationClosesAt: "2026-06-10T00:00:00.000Z",
        categories: [
          { name: "Category A", groupCount: 2, advancesPerGroup: 2 },
        ],
      },
      "owner_1",
    );

    expect(transactionMock).toHaveBeenCalled();
    expect(tournamentCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clubId: "club_1",
          name: "Summer Open",
        }),
      }),
    );
    expect(tournamentCategoryCreateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            tournamentId: "tourney_1",
            name: "Category A",
          }),
        ],
      }),
    );
    expect(result.id).toBe("tourney_1");
    expect(result.categories).toHaveLength(1);
  });
});

describe("listTournamentsForOwner", () => {
  it("lists tournaments scoped to the club", async () => {
    tournamentFindManyMock.mockResolvedValue([TOURNAMENT_ROW]);

    const result = await listTournamentsForOwner("club_1");

    expect(tournamentFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clubId: "club_1" } }),
    );
    expect(result).toHaveLength(1);
  });
});

describe("getTournamentDetailForOwner", () => {
  it("returns null when the tournament doesn't belong to this club", async () => {
    tournamentFindFirstMock.mockResolvedValue(null);

    const result = await getTournamentDetailForOwner("club_1", "tourney_1");

    expect(result).toBeNull();
    expect(tournamentFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tourney_1", clubId: "club_1" } }),
    );
  });

  it("returns the tournament with its categories when found", async () => {
    tournamentFindFirstMock.mockResolvedValue({
      ...TOURNAMENT_ROW,
      categories: [CATEGORY_ROW],
    });

    const result = await getTournamentDetailForOwner("club_1", "tourney_1");

    expect(result?.id).toBe("tourney_1");
    expect(result?.categories).toHaveLength(1);
  });
});

describe("updateTournament", () => {
  it("throws when the tournament doesn't belong to this club", async () => {
    tournamentFindFirstMock.mockResolvedValue(null);

    await expect(
      updateTournament("club_1", "tourney_1", { name: "New name" }, "owner_1"),
    ).rejects.toThrow("not found");
  });

  it("throws when the tournament is already cancelled", async () => {
    tournamentFindFirstMock.mockResolvedValue({
      ...TOURNAMENT_ROW,
      status: "CANCELLED",
    });

    await expect(
      updateTournament("club_1", "tourney_1", { name: "New name" }, "owner_1"),
    ).rejects.toThrow("cancelled");
  });

  it("updates the tournament fields", async () => {
    tournamentFindFirstMock.mockResolvedValue(TOURNAMENT_ROW);
    tournamentUpdateMock.mockResolvedValue({
      ...TOURNAMENT_ROW,
      name: "New name",
    });

    const result = await updateTournament(
      "club_1",
      "tourney_1",
      { name: "New name" },
      "owner_1",
    );

    expect(tournamentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tourney_1" },
        data: expect.objectContaining({
          name: "New name",
          updatedBy: "owner_1",
        }),
      }),
    );
    expect(result.name).toBe("New name");
  });
});

describe("publishTournament", () => {
  it("throws when the tournament isn't in DRAFT status", async () => {
    tournamentFindFirstMock.mockResolvedValue({
      ...TOURNAMENT_ROW,
      status: "REGISTRATION_OPEN",
    });

    await expect(
      publishTournament("club_1", "tourney_1", "owner_1"),
    ).rejects.toThrow("draft");
  });

  it("transitions DRAFT -> REGISTRATION_OPEN, sets publishedAt, and cascades categories", async () => {
    tournamentFindFirstMock.mockResolvedValue(TOURNAMENT_ROW);
    transactionMock.mockImplementation(async (callback) => {
      const tx = {
        tournament: { update: tournamentUpdateMock },
        tournamentCategory: {
          updateMany: tournamentCategoryUpdateManyMock,
          findMany: tournamentCategoryFindManyMock,
        },
      };
      return callback(tx);
    });
    tournamentUpdateMock.mockResolvedValue({
      ...TOURNAMENT_ROW,
      status: "REGISTRATION_OPEN",
      publishedAt: NOW,
    });
    tournamentCategoryUpdateManyMock.mockResolvedValue({ count: 1 });
    tournamentCategoryFindManyMock.mockResolvedValue([
      { ...CATEGORY_ROW, status: "REGISTRATION_OPEN" },
    ]);

    const result = await publishTournament("club_1", "tourney_1", "owner_1");

    expect(tournamentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "REGISTRATION_OPEN" }),
      }),
    );
    expect(tournamentCategoryUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId: "tourney_1" },
        data: { status: "REGISTRATION_OPEN" },
      }),
    );
    expect(result.status).toBe("REGISTRATION_OPEN");
    expect(result.publishedAt).toBeInstanceOf(Date);
  });
});

describe("cancelTournament", () => {
  it("throws when already cancelled", async () => {
    tournamentFindFirstMock.mockResolvedValue({
      ...TOURNAMENT_ROW,
      status: "CANCELLED",
    });

    await expect(
      cancelTournament("club_1", "tourney_1", "owner_1"),
    ).rejects.toThrow("already cancelled");
  });

  it("cancels the tournament and cascades non-terminal categories", async () => {
    tournamentFindFirstMock.mockResolvedValue(TOURNAMENT_ROW);
    transactionMock.mockImplementation(async (callback) => {
      const tx = {
        tournament: { update: tournamentUpdateMock },
        tournamentCategory: {
          updateMany: tournamentCategoryUpdateManyMock,
          findMany: tournamentCategoryFindManyMock,
        },
      };
      return callback(tx);
    });
    tournamentUpdateMock.mockResolvedValue({
      ...TOURNAMENT_ROW,
      status: "CANCELLED",
    });
    tournamentCategoryUpdateManyMock.mockResolvedValue({ count: 1 });
    tournamentCategoryFindManyMock.mockResolvedValue([
      { ...CATEGORY_ROW, status: "CANCELLED" },
    ]);

    const result = await cancelTournament("club_1", "tourney_1", "owner_1");

    expect(result.status).toBe("CANCELLED");
  });
});

describe("listOpenTournamentsForPlayer", () => {
  it("queries open tournaments OR ones the player has an active team in, joining club name", async () => {
    tournamentFindManyMock.mockResolvedValue([
      {
        ...TOURNAMENT_ROW,
        status: "REGISTRATION_OPEN",
        club: { name: "Club X" },
      },
    ]);

    const result = await listOpenTournamentsForPlayer("player_1");

    expect(tournamentFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      }),
    );
    expect(result[0].clubName).toBe("Club X");
  });
});

describe("getTournamentDetailForPlayer", () => {
  it("returns null when the tournament doesn't exist", async () => {
    tournamentFindUniqueMock.mockResolvedValue(null);

    const result = await getTournamentDetailForPlayer("tourney_1", "player_1");

    expect(result).toBeNull();
  });

  it("returns the tournament with categories, club name, and the viewer's own teams", async () => {
    tournamentFindUniqueMock.mockResolvedValue({
      ...TOURNAMENT_ROW,
      categories: [CATEGORY_ROW],
      club: { name: "Club X" },
    });
    tournamentTeamFindManyMock.mockResolvedValue([
      {
        id: "team_1",
        tournamentCategoryId: "cat_1",
        player1Id: "player_1",
        player2Id: "partner_1",
        combinedCategoryLevel: 3,
        status: "REGISTERED",
        createdAt: NOW,
        updatedAt: NOW,
        createdBy: "player_1",
        withdrawnAt: null,
        withdrawnBy: null,
      },
    ]);

    const result = await getTournamentDetailForPlayer("tourney_1", "player_1");

    expect(result?.clubName).toBe("Club X");
    expect(result?.myTeams).toHaveLength(1);
    expect(result?.myTeams[0].id).toBe("team_1");
  });
});
