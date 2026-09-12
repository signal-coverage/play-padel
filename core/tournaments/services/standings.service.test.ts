import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  groupFindUniqueMock,
  groupFindManyMock,
  matchFindManyMock,
  categoryFindUniqueMock,
  teamFindManyMock,
} = vi.hoisted(() => ({
  groupFindUniqueMock: vi.fn(),
  groupFindManyMock: vi.fn(),
  matchFindManyMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
  teamFindManyMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    tournamentGroup: {
      findUnique: groupFindUniqueMock,
      findMany: groupFindManyMock,
    },
    tournamentMatch: {
      findMany: matchFindManyMock,
    },
    tournamentCategory: {
      findUnique: categoryFindUniqueMock,
    },
    tournamentTeam: {
      findMany: teamFindManyMock,
    },
  },
}));

import {
  computeGroupStandings,
  computePerformanceSummaryForPlayer,
  getCategoryStandingsDetail,
} from "./standings.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("computeGroupStandings", () => {
  it("throws when the group doesn't exist", async () => {
    groupFindUniqueMock.mockResolvedValue(null);

    await expect(computeGroupStandings("group_1")).rejects.toThrow("not found");
  });

  it("only fetches resolved (COMPLETED/WALKOVER) matches for the group", async () => {
    groupFindUniqueMock.mockResolvedValue({
      id: "group_1",
      teams: [{ id: "t1" }, { id: "t2" }],
    });
    matchFindManyMock.mockResolvedValue([]);

    await computeGroupStandings("group_1");

    expect(matchFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          groupId: "group_1",
          status: { in: ["COMPLETED", "WALKOVER"] },
        },
        include: { sets: true },
      }),
    );
  });

  it("derives set/game tallies from each COMPLETED match's MatchSet rows", async () => {
    groupFindUniqueMock.mockResolvedValue({
      id: "group_1",
      teams: [{ id: "t1" }, { id: "t2" }],
    });
    matchFindManyMock.mockResolvedValue([
      {
        teamAId: "t1",
        teamBId: "t2",
        status: "COMPLETED",
        winnerTeamId: "t1",
        sets: [
          { setNumber: 1, teamAGames: 6, teamBGames: 4 },
          { setNumber: 2, teamAGames: 6, teamBGames: 2 },
        ],
      },
    ]);

    const rows = await computeGroupStandings("group_1");
    const byId = Object.fromEntries(rows.map((r) => [r.teamId, r]));

    expect(byId.t1.wins).toBe(1);
    expect(byId.t1.setsWon).toBe(2);
    expect(byId.t1.setsLost).toBe(0);
    expect(byId.t1.gamesWon).toBe(12);
    expect(byId.t1.gamesLost).toBe(6);
    expect(byId.t2.wins).toBe(0);
  });

  it("counts a WALKOVER match (no sets) toward the winner's tally only", async () => {
    groupFindUniqueMock.mockResolvedValue({
      id: "group_1",
      teams: [{ id: "t1" }, { id: "t2" }],
    });
    matchFindManyMock.mockResolvedValue([
      {
        teamAId: "t1",
        teamBId: "t2",
        status: "WALKOVER",
        winnerTeamId: "t1",
        sets: [],
      },
    ]);

    const rows = await computeGroupStandings("group_1");
    const byId = Object.fromEntries(rows.map((r) => [r.teamId, r]));

    expect(byId.t1.wins).toBe(1);
    expect(byId.t1.setsWon).toBe(0);
    expect(byId.t2.wins).toBe(0);
  });
});

const NOW = new Date();

describe("getCategoryStandingsDetail", () => {
  it("returns null when the category doesn't exist", async () => {
    categoryFindUniqueMock.mockResolvedValue(null);

    const result = await getCategoryStandingsDetail("cat_1");

    expect(result).toBeNull();
  });

  it("returns empty groups/knockoutRounds/teams for a category with none yet", async () => {
    categoryFindUniqueMock.mockResolvedValue({ id: "cat_1" });
    groupFindManyMock.mockResolvedValue([]);
    matchFindManyMock.mockResolvedValue([]);
    teamFindManyMock.mockResolvedValue([]);

    const result = await getCategoryStandingsDetail("cat_1");

    expect(result).toEqual({ groups: [], knockoutRounds: [], teams: [] });
  });

  it("assembles each group's standings/matches and buckets knockout matches by round", async () => {
    categoryFindUniqueMock.mockResolvedValue({ id: "cat_1" });
    groupFindManyMock.mockResolvedValue([
      {
        id: "group_a",
        tournamentCategoryId: "cat_1",
        name: "Group A",
        position: 0,
        createdAt: NOW,
        updatedAt: NOW,
        teams: [{ id: "t1" }, { id: "t2" }],
      },
    ]);
    groupFindUniqueMock.mockResolvedValue({
      id: "group_a",
      teams: [{ id: "t1" }, { id: "t2" }],
    });

    const groupMatchRow = {
      id: "match_1",
      tournamentCategoryId: "cat_1",
      stage: "GROUP",
      groupId: "group_a",
      knockoutRound: null,
      nextMatchId: null,
      nextMatchSlot: null,
      teamAId: "t1",
      teamBId: "t2",
      status: "COMPLETED",
      winnerTeamId: "t1",
      scheduledAt: null,
      completedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
      sets: [{ setNumber: 1, teamAGames: 6, teamBGames: 2 }],
    };
    const knockoutMatchRow = {
      ...groupMatchRow,
      id: "ko_1",
      stage: "KNOCKOUT",
      groupId: null,
      knockoutRound: "FINAL",
      teamAId: "t1",
      teamBId: "t3",
      status: "SCHEDULED",
      winnerTeamId: null,
      sets: [],
    };

    matchFindManyMock.mockImplementation(async (args) => {
      if (args.where.stage === "KNOCKOUT") return [knockoutMatchRow];
      if (args.where.status) return [groupMatchRow]; // computeGroupStandings
      return [groupMatchRow]; // listMatchesForGroup
    });
    teamFindManyMock.mockResolvedValue([
      {
        id: "t1",
        tournamentCategoryId: "cat_1",
        player1Id: "u1",
        player2Id: "u2",
        combinedCategoryLevel: null,
        status: "REGISTERED",
        groupId: "group_a",
        createdAt: NOW,
        updatedAt: NOW,
        createdBy: "u1",
        withdrawnAt: null,
        withdrawnBy: null,
        player1: { displayName: "Alice" },
        player2: { displayName: "Ana" },
      },
    ]);

    const result = await getCategoryStandingsDetail("cat_1");

    expect(result?.groups).toHaveLength(1);
    expect(result?.groups[0].group.id).toBe("group_a");
    expect(result?.groups[0].matches).toHaveLength(1);
    expect(
      result?.groups[0].standings.find((r) => r.teamId === "t1")?.wins,
    ).toBe(1);
    expect(result?.knockoutRounds).toEqual([
      { round: "FINAL", matches: expect.any(Array) },
    ]);
    expect(result?.knockoutRounds[0].matches).toHaveLength(1);
    expect(result?.teams).toHaveLength(1);
    expect(result?.teams[0].player1DisplayName).toBe("Alice");
  });
});

describe("computePerformanceSummaryForPlayer", () => {
  function team(overrides: {
    id: string;
    status: string;
    createdAt: Date;
    tournamentId: string;
    tournamentName: string;
  }) {
    return {
      id: overrides.id,
      status: overrides.status,
      createdAt: overrides.createdAt,
      tournamentCategory: {
        tournamentId: overrides.tournamentId,
        tournament: { name: overrides.tournamentName },
      },
    };
  }

  it("returns the zero-history shape when the player has no tournament teams at all", async () => {
    teamFindManyMock.mockResolvedValue([]);

    const result = await computePerformanceSummaryForPlayer("player_1");

    expect(result).toEqual({
      tournamentsWon: 0,
      tournamentsPlayed: 0,
      latestTournamentName: "",
      latestResults: [],
    });
    expect(matchFindManyMock).not.toHaveBeenCalled();
  });

  it("counts DISTINCT tournaments played, excluding a WITHDRAWN team's tournament", async () => {
    teamFindManyMock.mockResolvedValue([
      team({
        id: "team_1",
        status: "REGISTERED",
        createdAt: new Date("2026-01-01"),
        tournamentId: "t1",
        tournamentName: "Summer Open",
      }),
      // Same tournament, a different category -- still counts once (DISTINCT).
      team({
        id: "team_2",
        status: "ADVANCED",
        createdAt: new Date("2026-01-02"),
        tournamentId: "t1",
        tournamentName: "Summer Open",
      }),
      team({
        id: "team_3",
        status: "WITHDRAWN",
        createdAt: new Date("2026-01-03"),
        tournamentId: "t2",
        tournamentName: "Withdrawn Cup",
      }),
    ]);
    matchFindManyMock.mockResolvedValue([]);

    const result = await computePerformanceSummaryForPlayer("player_1");

    expect(result.tournamentsPlayed).toBe(1);
  });

  it("counts DISTINCT tournaments won -- a team reaching CHAMPION in any category", async () => {
    teamFindManyMock.mockResolvedValue([
      team({
        id: "team_1",
        status: "CHAMPION",
        createdAt: new Date("2026-01-01"),
        tournamentId: "t1",
        tournamentName: "Summer Open",
      }),
      team({
        id: "team_2",
        status: "ELIMINATED",
        createdAt: new Date("2026-01-02"),
        tournamentId: "t2",
        tournamentName: "Winter Cup",
      }),
    ]);
    matchFindManyMock.mockResolvedValue([]);

    const result = await computePerformanceSummaryForPlayer("player_1");

    expect(result.tournamentsWon).toBe(1);
    expect(result.tournamentsPlayed).toBe(2);
  });

  it("falls back to the most recently registered team's tournament when the player has no completed matches yet", async () => {
    teamFindManyMock.mockResolvedValue([
      team({
        id: "team_1",
        status: "REGISTERED",
        createdAt: new Date("2026-01-01"),
        tournamentId: "t1",
        tournamentName: "Older Registration",
      }),
      team({
        id: "team_2",
        status: "REGISTERED",
        createdAt: new Date("2026-02-01"),
        tournamentId: "t2",
        tournamentName: "Newer Registration",
      }),
    ]);
    matchFindManyMock.mockResolvedValue([]);

    const result = await computePerformanceSummaryForPlayer("player_1");

    expect(result.latestTournamentName).toBe("Newer Registration");
    expect(result.latestResults).toEqual([]);
  });

  it("derives latestTournamentName from the most-recently-completed match, and maps W/L via winnerTeamId against the player's own team", async () => {
    teamFindManyMock.mockResolvedValue([
      team({
        id: "team_1",
        status: "ELIMINATED",
        createdAt: new Date("2026-01-01"),
        tournamentId: "t1",
        tournamentName: "Summer Open",
      }),
    ]);
    matchFindManyMock.mockResolvedValue([
      {
        teamAId: "team_1",
        teamBId: "team_other",
        winnerTeamId: "team_1",
        completedAt: new Date("2026-03-02"),
        tournamentCategory: { tournament: { name: "Summer Open" } },
      },
      {
        teamAId: "team_other",
        teamBId: "team_1",
        winnerTeamId: "team_other",
        completedAt: new Date("2026-03-01"),
        tournamentCategory: { tournament: { name: "Summer Open" } },
      },
    ]);

    const result = await computePerformanceSummaryForPlayer("player_1");

    expect(result.latestTournamentName).toBe("Summer Open");
    expect(result.latestResults).toEqual(["W", "L"]);
  });

  it("counts a WALKOVER as a real result", async () => {
    teamFindManyMock.mockResolvedValue([
      team({
        id: "team_1",
        status: "ADVANCED",
        createdAt: new Date("2026-01-01"),
        tournamentId: "t1",
        tournamentName: "Summer Open",
      }),
    ]);
    matchFindManyMock.mockResolvedValue([
      {
        teamAId: "team_1",
        teamBId: "team_other",
        winnerTeamId: "team_1",
        completedAt: new Date("2026-03-05"),
        tournamentCategory: { tournament: { name: "Summer Open" } },
      },
    ]);

    const result = await computePerformanceSummaryForPlayer("player_1");

    expect(result.latestResults).toEqual(["W"]);
  });

  it("spans results across multiple different tournaments, not just the latest one", async () => {
    teamFindManyMock.mockResolvedValue([
      team({
        id: "team_1",
        status: "ELIMINATED",
        createdAt: new Date("2026-01-01"),
        tournamentId: "t1",
        tournamentName: "Summer Open",
      }),
      team({
        id: "team_2",
        status: "ELIMINATED",
        createdAt: new Date("2026-02-01"),
        tournamentId: "t2",
        tournamentName: "Winter Cup",
      }),
    ]);
    matchFindManyMock.mockResolvedValue([
      {
        teamAId: "team_2",
        teamBId: "team_other",
        winnerTeamId: "team_2",
        completedAt: new Date("2026-03-10"),
        tournamentCategory: { tournament: { name: "Winter Cup" } },
      },
      {
        teamAId: "team_1",
        teamBId: "team_other",
        winnerTeamId: "team_other",
        completedAt: new Date("2026-03-05"),
        tournamentCategory: { tournament: { name: "Summer Open" } },
      },
    ]);

    const result = await computePerformanceSummaryForPlayer("player_1");

    expect(result.latestResults).toEqual(["W", "L"]);
    expect(result.latestTournamentName).toBe("Winter Cup");
  });

  it("orders by completedAt descending and breaks exact ties deterministically via id, and caps at 5 results", async () => {
    teamFindManyMock.mockResolvedValue([
      team({
        id: "team_1",
        status: "ELIMINATED",
        createdAt: new Date("2026-01-01"),
        tournamentId: "t1",
        tournamentName: "Summer Open",
      }),
    ]);
    // The service must ask Prisma to order+limit -- this test asserts the
    // exact query shape rather than re-sorting client-side, since two rows
    // sharing one completedAt timestamp can only be deterministically
    // ordered by the database itself (see the id tie-break below).
    matchFindManyMock.mockImplementation(async () => [
      {
        teamAId: "team_1",
        teamBId: "team_other",
        winnerTeamId: "team_1",
        completedAt: new Date("2026-03-05"),
        tournamentCategory: { tournament: { name: "Summer Open" } },
      },
    ]);

    await computePerformanceSummaryForPlayer("player_1");

    expect(matchFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ completedAt: "desc" }, { id: "desc" }],
        take: 5,
      }),
    );
  });
});
