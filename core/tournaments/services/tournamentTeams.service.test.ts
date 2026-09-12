import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  categoryFindUniqueMock,
  userFindUniqueMock,
  teamFindFirstMock,
  teamFindManyMock,
  teamCountMock,
  teamCreateMock,
  teamUpdateMock,
} = vi.hoisted(() => ({
  categoryFindUniqueMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  teamFindFirstMock: vi.fn(),
  teamFindManyMock: vi.fn(),
  teamCountMock: vi.fn(),
  teamCreateMock: vi.fn(),
  teamUpdateMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    tournamentCategory: {
      findUnique: categoryFindUniqueMock,
    },
    userProfile: {
      findUnique: userFindUniqueMock,
    },
    tournamentTeam: {
      findFirst: teamFindFirstMock,
      findMany: teamFindManyMock,
      count: teamCountMock,
      create: teamCreateMock,
      update: teamUpdateMock,
    },
  },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import {
  registerTeam,
  withdrawTeam,
  listTeamsForCategory,
  listTeamsForCategoryWithPlayers,
} from "./tournamentTeams.service";

beforeEach(() => {
  vi.clearAllMocks();
});

const NOW = new Date();

const OPEN_CATEGORY = {
  id: "cat_1",
  tournamentId: "tourney_1",
  name: "Category A",
  status: "REGISTRATION_OPEN",
  minCategoryLevel: null,
  maxCategoryLevel: null,
  groupCount: 2,
  advancesPerGroup: 2,
  maxTeams: null,
  createdAt: NOW,
  updatedAt: NOW,
  tournament: {
    id: "tourney_1",
    clubId: "club_1",
    status: "REGISTRATION_OPEN",
    registrationOpensAt: new Date(Date.now() - 60_000),
    registrationClosesAt: new Date(Date.now() + 60_000),
  },
};

const TEAM_ROW = {
  id: "team_1",
  tournamentCategoryId: "cat_1",
  player1Id: "player_1",
  player2Id: "player_2",
  combinedCategoryLevel: 3,
  status: "REGISTERED",
  createdAt: NOW,
  updatedAt: NOW,
  createdBy: "player_1",
  withdrawnAt: null,
  withdrawnBy: null,
};

describe("registerTeam", () => {
  it("throws when a player tries to register with themself", async () => {
    await expect(registerTeam("cat_1", "player_1", "player_1")).rejects.toThrow(
      "yourself",
    );
    expect(categoryFindUniqueMock).not.toHaveBeenCalled();
  });

  it("throws when the category doesn't exist", async () => {
    categoryFindUniqueMock.mockResolvedValue(null);

    await expect(registerTeam("cat_1", "player_1", "player_2")).rejects.toThrow(
      "not found",
    );
  });

  it("throws when the tournament isn't REGISTRATION_OPEN", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      ...OPEN_CATEGORY,
      tournament: { ...OPEN_CATEGORY.tournament, status: "DRAFT" },
    });

    await expect(registerTeam("cat_1", "player_1", "player_2")).rejects.toThrow(
      "Registration is not open",
    );
  });

  it("throws when outside the registration window", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      ...OPEN_CATEGORY,
      tournament: {
        ...OPEN_CATEGORY.tournament,
        registrationOpensAt: new Date("2026-07-01T00:00:00.000Z"),
        registrationClosesAt: new Date("2026-07-10T00:00:00.000Z"),
      },
    });

    await expect(registerTeam("cat_1", "player_1", "player_2")).rejects.toThrow(
      "Registration is not open",
    );
  });

  it("throws when the partner doesn't exist", async () => {
    categoryFindUniqueMock.mockResolvedValue(OPEN_CATEGORY);
    userFindUniqueMock.mockImplementation(({ where }) =>
      Promise.resolve(
        where.id === "player_1"
          ? { id: "player_1", displayName: "P1", padelCategory: 3 }
          : null,
      ),
    );

    await expect(registerTeam("cat_1", "player_1", "player_2")).rejects.toThrow(
      "Partner",
    );
  });

  it("throws when either player already has a team in this category", async () => {
    categoryFindUniqueMock.mockResolvedValue(OPEN_CATEGORY);
    userFindUniqueMock.mockImplementation(({ where }) =>
      Promise.resolve({
        id: where.id,
        displayName: where.id,
        padelCategory: 3,
      }),
    );
    teamFindFirstMock.mockResolvedValue({ id: "existing_team" });

    await expect(registerTeam("cat_1", "player_1", "player_2")).rejects.toThrow(
      "already registered",
    );
  });

  it("throws when a player's padelCategory is outside the category's bounds", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      ...OPEN_CATEGORY,
      minCategoryLevel: 1,
      maxCategoryLevel: 3,
    });
    userFindUniqueMock.mockImplementation(({ where }) =>
      Promise.resolve(
        where.id === "player_1"
          ? { id: "player_1", displayName: "P1", padelCategory: 5 }
          : { id: "player_2", displayName: "P2", padelCategory: 2 },
      ),
    );
    teamFindFirstMock.mockResolvedValue(null);

    await expect(registerTeam("cat_1", "player_1", "player_2")).rejects.toThrow(
      "outside this category's allowed range",
    );
  });

  it("throws when the category has reached its maxTeams cap", async () => {
    categoryFindUniqueMock.mockResolvedValue({ ...OPEN_CATEGORY, maxTeams: 4 });
    userFindUniqueMock.mockImplementation(({ where }) =>
      Promise.resolve({
        id: where.id,
        displayName: where.id,
        padelCategory: 3,
      }),
    );
    teamFindFirstMock.mockResolvedValue(null);
    teamCountMock.mockResolvedValue(4);

    await expect(registerTeam("cat_1", "player_1", "player_2")).rejects.toThrow(
      "maximum number of teams",
    );
  });

  it("registers the team, computing combinedCategoryLevel as the rounded average", async () => {
    categoryFindUniqueMock.mockResolvedValue(OPEN_CATEGORY);
    userFindUniqueMock.mockImplementation(({ where }) =>
      Promise.resolve(
        where.id === "player_1"
          ? { id: "player_1", displayName: "P1", padelCategory: 3 }
          : { id: "player_2", displayName: "P2", padelCategory: 4 },
      ),
    );
    teamFindFirstMock.mockResolvedValue(null);
    teamCreateMock.mockResolvedValue(TEAM_ROW);

    const result = await registerTeam("cat_1", "player_1", "player_2");

    expect(teamCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tournamentCategoryId: "cat_1",
          player1Id: "player_1",
          player2Id: "player_2",
          combinedCategoryLevel: 4,
        }),
      }),
    );
    expect(result.id).toBe("team_1");
  });

  it("snapshots combinedCategoryLevel as null when either partner has no padelCategory", async () => {
    categoryFindUniqueMock.mockResolvedValue(OPEN_CATEGORY);
    userFindUniqueMock.mockImplementation(({ where }) =>
      Promise.resolve(
        where.id === "player_1"
          ? { id: "player_1", displayName: "P1", padelCategory: null }
          : { id: "player_2", displayName: "P2", padelCategory: 4 },
      ),
    );
    teamFindFirstMock.mockResolvedValue(null);
    teamCreateMock.mockResolvedValue({
      ...TEAM_ROW,
      combinedCategoryLevel: null,
    });

    await registerTeam("cat_1", "player_1", "player_2");

    expect(teamCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ combinedCategoryLevel: null }),
      }),
    );
  });
});

describe("withdrawTeam", () => {
  const TEAM_WITH_CATEGORY = {
    ...TEAM_ROW,
    tournamentCategory: OPEN_CATEGORY,
  };

  it("throws when the team doesn't exist", async () => {
    teamFindFirstMock.mockResolvedValue(null);

    await expect(withdrawTeam("team_1", "player_1")).rejects.toThrow(
      "not found",
    );
  });

  it("allows a team member to withdraw", async () => {
    teamFindFirstMock.mockResolvedValue(TEAM_WITH_CATEGORY);
    teamUpdateMock.mockResolvedValue({ ...TEAM_ROW, status: "WITHDRAWN" });

    const result = await withdrawTeam("team_1", "player_1");

    expect(teamUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "team_1" },
        data: expect.objectContaining({
          status: "WITHDRAWN",
          withdrawnBy: "player_1",
        }),
      }),
    );
    expect(result.status).toBe("WITHDRAWN");
  });

  it("allows the owning club's owner to withdraw", async () => {
    teamFindFirstMock.mockResolvedValue(TEAM_WITH_CATEGORY);
    userFindUniqueMock.mockResolvedValue({ role: "owner", clubId: "club_1" });
    teamUpdateMock.mockResolvedValue({ ...TEAM_ROW, status: "WITHDRAWN" });

    const result = await withdrawTeam("team_1", "owner_1");

    expect(result.status).toBe("WITHDRAWN");
  });

  it("throws when the acting user is neither a team member nor the owning club's owner", async () => {
    teamFindFirstMock.mockResolvedValue(TEAM_WITH_CATEGORY);
    userFindUniqueMock.mockResolvedValue({ role: "player", clubId: null });

    await expect(withdrawTeam("team_1", "stranger_1")).rejects.toThrow(
      "not allowed",
    );
  });

  it("throws once groups are locked", async () => {
    teamFindFirstMock.mockResolvedValue({
      ...TEAM_WITH_CATEGORY,
      tournamentCategory: { ...OPEN_CATEGORY, status: "GROUPS_LOCKED" },
    });

    await expect(withdrawTeam("team_1", "player_1")).rejects.toThrow(
      "no longer be withdrawn",
    );
  });

  it("throws when the team already withdrew", async () => {
    teamFindFirstMock.mockResolvedValue({
      ...TEAM_WITH_CATEGORY,
      status: "WITHDRAWN",
    });

    await expect(withdrawTeam("team_1", "player_1")).rejects.toThrow(
      "already withdrawn",
    );
  });
});

describe("listTeamsForCategory", () => {
  it("lists teams for the category", async () => {
    teamFindManyMock.mockResolvedValue([TEAM_ROW]);

    const result = await listTeamsForCategory("cat_1");

    expect(teamFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tournamentCategoryId: "cat_1" } }),
    );
    expect(result).toHaveLength(1);
  });
});

describe("listTeamsForCategoryWithPlayers", () => {
  it("lists teams with each player's display name joined in", async () => {
    teamFindManyMock.mockResolvedValue([
      {
        ...TEAM_ROW,
        player1: { id: "player_1", displayName: "Alice" },
        player2: { id: "player_2", displayName: "Bob" },
      },
    ]);

    const result = await listTeamsForCategoryWithPlayers("cat_1");

    expect(teamFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentCategoryId: "cat_1" },
        include: expect.objectContaining({
          player1: expect.anything(),
          player2: expect.anything(),
        }),
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "team_1",
        player1DisplayName: "Alice",
        player2DisplayName: "Bob",
      }),
    ]);
  });
});
