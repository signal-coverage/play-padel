import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  matchFindUniqueMock,
  matchFindManyMock,
  matchUpdateMock,
  matchCreateMock,
  matchCountMock,
  setCreateManyMock,
  userFindUniqueMock,
  teamUpdateMock,
  teamUpdateManyMock,
  categoryFindUniqueMock,
  categoryUpdateMock,
  categoryFindManyMock,
  tournamentFindUniqueMock,
  tournamentUpdateMock,
  transactionMock,
} = vi.hoisted(() => ({
  matchFindUniqueMock: vi.fn(),
  matchFindManyMock: vi.fn(),
  matchUpdateMock: vi.fn(),
  matchCreateMock: vi.fn(),
  matchCountMock: vi.fn(),
  setCreateManyMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  teamUpdateMock: vi.fn(),
  teamUpdateManyMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
  categoryUpdateMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
  tournamentFindUniqueMock: vi.fn(),
  tournamentUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    tournamentMatch: {
      findUnique: matchFindUniqueMock,
      findMany: matchFindManyMock,
      update: matchUpdateMock,
      create: matchCreateMock,
      count: matchCountMock,
    },
    matchSet: {
      createMany: setCreateManyMock,
    },
    userProfile: {
      findUnique: userFindUniqueMock,
    },
    tournamentTeam: {
      update: teamUpdateMock,
      updateMany: teamUpdateManyMock,
    },
    tournamentCategory: {
      findUnique: categoryFindUniqueMock,
      update: categoryUpdateMock,
      findMany: categoryFindManyMock,
    },
    tournament: {
      findUnique: tournamentFindUniqueMock,
      update: tournamentUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/core/audit/services/audit.service", () => ({
  logAudit: vi.fn(),
}));

import {
  enterMatchScore,
  recordWalkover,
  listMatchesForGroup,
  listMatchesForCategory,
  listKnockoutMatchesForCategory,
  generateKnockoutBracket,
} from "./matches.service";

const NOW = new Date();

const MATCH_ROW = {
  id: "match_1",
  tournamentCategoryId: "cat_1",
  groupId: "group_1",
  stage: "GROUP",
  knockoutRound: null,
  nextMatchId: null,
  nextMatchSlot: null,
  teamAId: "team_a",
  teamBId: "team_b",
  status: "SCHEDULED",
  winnerTeamId: null,
  scheduledAt: null,
  completedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  tournamentCategory: {
    tournamentId: "tourney_1",
    tournament: { clubId: "club_1" },
  },
};

function mockTx() {
  return {
    matchSet: { createMany: setCreateManyMock },
    tournamentMatch: {
      update: matchUpdateMock,
      create: matchCreateMock,
      findMany: matchFindManyMock,
    },
    tournamentTeam: {
      update: teamUpdateMock,
      updateMany: teamUpdateManyMock,
    },
    tournamentCategory: {
      update: categoryUpdateMock,
      findMany: categoryFindManyMock,
    },
    tournament: {
      findUnique: tournamentFindUniqueMock,
      update: tournamentUpdateMock,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  userFindUniqueMock.mockResolvedValue({ displayName: "Owner" });
  transactionMock.mockImplementation(async (callback) => callback(mockTx()));
  categoryFindManyMock.mockResolvedValue([]);
  matchFindManyMock.mockResolvedValue([]);
});

describe("enterMatchScore", () => {
  it("throws when the match doesn't exist or isn't owned by this club", async () => {
    matchFindUniqueMock.mockResolvedValue(null);

    await expect(
      enterMatchScore(
        "match_1",
        [{ setNumber: 1, teamAGames: 6, teamBGames: 4 }],
        "club_1",
        "owner_1",
      ),
    ).rejects.toThrow("not found");
  });

  it("throws when the match belongs to a different club", async () => {
    matchFindUniqueMock.mockResolvedValue(MATCH_ROW);

    await expect(
      enterMatchScore(
        "match_1",
        [{ setNumber: 1, teamAGames: 6, teamBGames: 4 }],
        "other_club",
        "owner_1",
      ),
    ).rejects.toThrow("not found");
  });

  it("throws instead of persisting an incomplete score", async () => {
    matchFindUniqueMock.mockResolvedValue(MATCH_ROW);

    await expect(
      enterMatchScore(
        "match_1",
        [{ setNumber: 1, teamAGames: 6, teamBGames: 4 }],
        "club_1",
        "owner_1",
      ),
    ).rejects.toThrow("not complete");
    expect(setCreateManyMock).not.toHaveBeenCalled();
    expect(matchUpdateMock).not.toHaveBeenCalled();
  });

  it("writes MatchSet rows and completes the match on a full score", async () => {
    matchFindUniqueMock.mockResolvedValue(MATCH_ROW);
    matchUpdateMock.mockResolvedValue({
      ...MATCH_ROW,
      status: "COMPLETED",
      winnerTeamId: "team_a",
    });

    const sets = [
      { setNumber: 1, teamAGames: 6, teamBGames: 4 },
      { setNumber: 2, teamAGames: 6, teamBGames: 2 },
    ];

    await enterMatchScore("match_1", sets, "club_1", "owner_1");

    expect(setCreateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            matchId: "match_1",
            setNumber: 1,
            teamAGames: 6,
            teamBGames: 4,
          }),
          expect.objectContaining({
            matchId: "match_1",
            setNumber: 2,
            teamAGames: 6,
            teamBGames: 2,
          }),
        ],
      }),
    );
    expect(matchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "match_1" },
        data: expect.objectContaining({
          status: "COMPLETED",
          winnerTeamId: "team_a",
        }),
      }),
    );
  });

  it("throws when the match is already decided", async () => {
    matchFindUniqueMock.mockResolvedValue({
      ...MATCH_ROW,
      status: "COMPLETED",
    });

    await expect(
      enterMatchScore(
        "match_1",
        [
          { setNumber: 1, teamAGames: 6, teamBGames: 4 },
          { setNumber: 2, teamAGames: 6, teamBGames: 2 },
        ],
        "club_1",
        "owner_1",
      ),
    ).rejects.toThrow("already been decided");
  });
});

describe("recordWalkover", () => {
  it("throws when the match doesn't exist or isn't owned by this club", async () => {
    matchFindUniqueMock.mockResolvedValue(null);

    await expect(
      recordWalkover("match_1", "team_a", "club_1", "owner_1"),
    ).rejects.toThrow("not found");
  });

  it("throws when the winning team isn't one of the match's two teams", async () => {
    matchFindUniqueMock.mockResolvedValue(MATCH_ROW);

    await expect(
      recordWalkover("match_1", "some_other_team", "club_1", "owner_1"),
    ).rejects.toThrow("must be one of");
  });

  it("throws when the match is already decided", async () => {
    matchFindUniqueMock.mockResolvedValue({
      ...MATCH_ROW,
      status: "COMPLETED",
    });

    await expect(
      recordWalkover("match_1", "team_a", "club_1", "owner_1"),
    ).rejects.toThrow("already been decided");
  });

  it("sets WALKOVER status with the winning team and no MatchSet rows", async () => {
    matchFindUniqueMock.mockResolvedValue(MATCH_ROW);
    matchUpdateMock.mockResolvedValue({
      ...MATCH_ROW,
      status: "WALKOVER",
      winnerTeamId: "team_a",
    });

    await recordWalkover("match_1", "team_a", "club_1", "owner_1");

    expect(matchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "match_1" },
        data: expect.objectContaining({
          status: "WALKOVER",
          winnerTeamId: "team_a",
        }),
      }),
    );
    expect(setCreateManyMock).not.toHaveBeenCalled();
  });
});

const KNOCKOUT_MATCH_ROW = {
  ...MATCH_ROW,
  id: "ko_match_1",
  stage: "KNOCKOUT",
  groupId: null,
  knockoutRound: "SEMIFINAL",
};

describe("enterMatchScore — knockout progression", () => {
  it("advances the winner into the next match's slot when one exists", async () => {
    matchFindUniqueMock.mockResolvedValue({
      ...KNOCKOUT_MATCH_ROW,
      nextMatchId: "ko_match_final",
      nextMatchSlot: "B",
    });
    matchUpdateMock.mockResolvedValue({});

    await enterMatchScore(
      "ko_match_1",
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 6, teamBGames: 2 },
      ],
      "club_1",
      "owner_1",
    );

    expect(matchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ko_match_final" },
        data: { teamBId: "team_a" },
      }),
    );
    expect(categoryUpdateMock).not.toHaveBeenCalled();
  });

  it("runs the category completion cascade when the FINAL is decided", async () => {
    matchFindUniqueMock.mockResolvedValue({
      ...KNOCKOUT_MATCH_ROW,
      knockoutRound: "FINAL",
      nextMatchId: null,
      nextMatchSlot: null,
    });
    matchUpdateMock.mockResolvedValue({});
    matchFindManyMock.mockResolvedValue([
      { teamAId: "team_a", teamBId: "team_b", winnerTeamId: "team_a" },
      { teamAId: "team_c", teamBId: "team_a", winnerTeamId: "team_a" },
    ]);
    categoryFindManyMock.mockResolvedValue([{ status: "COMPLETED" }]);

    await enterMatchScore(
      "ko_match_1",
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 6, teamBGames: 2 },
      ],
      "club_1",
      "owner_1",
    );

    expect(teamUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["team_b", "team_c"] } },
        data: { status: "ELIMINATED" },
      }),
    );
    expect(teamUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "team_a" },
        data: { status: "CHAMPION" },
      }),
    );
    expect(categoryUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cat_1" },
        data: { status: "COMPLETED" },
      }),
    );
    expect(tournamentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tourney_1" },
        data: { status: "COMPLETED" },
      }),
    );
  });

  it("does not bump the tournament to COMPLETED while a sibling category is still open", async () => {
    matchFindUniqueMock.mockResolvedValue({
      ...KNOCKOUT_MATCH_ROW,
      knockoutRound: "FINAL",
      nextMatchId: null,
      nextMatchSlot: null,
    });
    matchUpdateMock.mockResolvedValue({});
    matchFindManyMock.mockResolvedValue([]);
    categoryFindManyMock.mockResolvedValue([
      { status: "COMPLETED" },
      { status: "KNOCKOUT" },
    ]);

    await enterMatchScore(
      "ko_match_1",
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 6, teamBGames: 2 },
      ],
      "club_1",
      "owner_1",
    );

    expect(tournamentUpdateMock).not.toHaveBeenCalled();
  });

  it("does nothing extra for a GROUP-stage match", async () => {
    matchFindUniqueMock.mockResolvedValue(MATCH_ROW);
    matchUpdateMock.mockResolvedValue({});

    await enterMatchScore(
      "match_1",
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 6, teamBGames: 2 },
      ],
      "club_1",
      "owner_1",
    );

    expect(categoryUpdateMock).not.toHaveBeenCalled();
    expect(teamUpdateMock).not.toHaveBeenCalled();
  });
});

describe("recordWalkover — knockout progression", () => {
  it("advances the winner into the next match's slot", async () => {
    matchFindUniqueMock.mockResolvedValue({
      ...KNOCKOUT_MATCH_ROW,
      nextMatchId: "ko_match_final",
      nextMatchSlot: "A",
    });
    matchUpdateMock.mockResolvedValue({});

    await recordWalkover("ko_match_1", "team_a", "club_1", "owner_1");

    expect(matchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ko_match_final" },
        data: { teamAId: "team_a" },
      }),
    );
  });
});

describe("listMatchesForGroup", () => {
  it("lists matches for the group", async () => {
    matchFindManyMock.mockResolvedValue([MATCH_ROW]);

    const result = await listMatchesForGroup("group_1");

    expect(matchFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: "group_1" } }),
    );
    expect(result).toHaveLength(1);
  });
});

describe("listMatchesForCategory", () => {
  it("lists matches for the category", async () => {
    matchFindManyMock.mockResolvedValue([MATCH_ROW]);

    const result = await listMatchesForCategory("cat_1");

    expect(matchFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentCategoryId: "cat_1" },
      }),
    );
    expect(result).toHaveLength(1);
  });
});

describe("listKnockoutMatchesForCategory", () => {
  it("lists only KNOCKOUT-stage matches, ordered by round", async () => {
    matchFindManyMock.mockResolvedValue([KNOCKOUT_MATCH_ROW]);

    const result = await listKnockoutMatchesForCategory("cat_1");

    expect(matchFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentCategoryId: "cat_1", stage: "KNOCKOUT" },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].knockoutRound).toBe("SEMIFINAL");
  });
});

function decidedGroupMatch(
  teamAId: string,
  teamBId: string,
  winnerTeamId: string,
) {
  return {
    teamAId,
    teamBId,
    status: "COMPLETED",
    winnerTeamId,
    sets: [{ setNumber: 1, teamAGames: 6, teamBGames: 0 }],
  };
}

function scheduledGroupMatch(teamAId: string, teamBId: string) {
  return {
    teamAId,
    teamBId,
    status: "SCHEDULED",
    winnerTeamId: null,
    sets: [],
  };
}

const CATEGORY_ROW = {
  id: "cat_1",
  tournamentId: "tourney_1",
  status: "GROUPS_LOCKED",
  advancesPerGroup: 1,
  tournament: { id: "tourney_1", clubId: "club_1" },
  groups: [
    {
      id: "group_a",
      position: 0,
      teams: [{ id: "t1" }, { id: "t2" }],
      matches: [decidedGroupMatch("t1", "t2", "t1")],
    },
    {
      id: "group_b",
      position: 1,
      teams: [{ id: "t3" }, { id: "t4" }],
      matches: [decidedGroupMatch("t3", "t4", "t3")],
    },
  ],
};

describe("generateKnockoutBracket", () => {
  it("throws when the category doesn't exist or isn't owned by this club", async () => {
    categoryFindUniqueMock.mockResolvedValue(null);

    await expect(
      generateKnockoutBracket("cat_1", "club_1", "owner_1"),
    ).rejects.toThrow("not found");
  });

  it("throws when groups aren't locked yet", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      ...CATEGORY_ROW,
      status: "REGISTRATION_CLOSED",
    });

    await expect(
      generateKnockoutBracket("cat_1", "club_1", "owner_1"),
    ).rejects.toThrow("must be locked");
  });

  it("throws when a knockout bracket already exists for this category", async () => {
    categoryFindUniqueMock.mockResolvedValue(CATEGORY_ROW);
    matchCountMock.mockResolvedValue(3);

    await expect(
      generateKnockoutBracket("cat_1", "club_1", "owner_1"),
    ).rejects.toThrow("already been generated");
  });

  it("throws when a group still has unscheduled matches", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      ...CATEGORY_ROW,
      groups: [
        {
          ...CATEGORY_ROW.groups[0],
          matches: [scheduledGroupMatch("t1", "t2")],
        },
        CATEGORY_ROW.groups[1],
      ],
    });
    matchCountMock.mockResolvedValue(0);

    await expect(
      generateKnockoutBracket("cat_1", "club_1", "owner_1"),
    ).rejects.toThrow("must be decided");
  });

  it("creates the bracket, wires nextMatchId pointers, and locks the category into KNOCKOUT", async () => {
    categoryFindUniqueMock.mockResolvedValue(CATEGORY_ROW);
    matchCountMock.mockResolvedValue(0);
    tournamentFindUniqueMock.mockResolvedValue({ status: "GROUPS_LOCKED" });
    let created = 0;
    matchCreateMock.mockImplementation(async ({ data }) => {
      created += 1;
      return { id: `ko_${created}`, winnerTeamId: data.winnerTeamId ?? null };
    });

    // 2 groups, advancesPerGroup=1 -> exactly 2 qualifiers (t1, t3) -> a
    // single FINAL match, no byes.
    await generateKnockoutBracket("cat_1", "club_1", "owner_1");

    expect(matchCreateMock).toHaveBeenCalledTimes(1);
    expect(matchCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tournamentCategoryId: "cat_1",
          stage: "KNOCKOUT",
          knockoutRound: "FINAL",
          teamAId: "t1",
          teamBId: "t3",
          status: "SCHEDULED",
        }),
      }),
    );
    expect(categoryUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cat_1" },
        data: { status: "KNOCKOUT" },
      }),
    );
    expect(tournamentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tourney_1" },
        data: { status: "KNOCKOUT" },
      }),
    );
  });

  it("auto-completes a bye match and propagates its winner into the next round", async () => {
    // 3 groups, advancesPerGroup=1 -> 3 qualifiers -> bracketSize 4, one bye.
    categoryFindUniqueMock.mockResolvedValue({
      ...CATEGORY_ROW,
      groups: [
        ...CATEGORY_ROW.groups,
        {
          id: "group_c",
          position: 2,
          teams: [{ id: "t5" }, { id: "t6" }],
          matches: [decidedGroupMatch("t5", "t6", "t5")],
        },
      ],
    });
    matchCountMock.mockResolvedValue(0);
    tournamentFindUniqueMock.mockResolvedValue({ status: "GROUPS_LOCKED" });
    let created = 0;
    matchCreateMock.mockImplementation(async ({ data }) => {
      created += 1;
      return { id: `ko_${created}`, winnerTeamId: data.winnerTeamId ?? null };
    });

    await generateKnockoutBracket("cat_1", "club_1", "owner_1");

    // 3 qualifiers -> bracketSize 4 -> 3 matches total (2 semis incl. 1 bye, 1 final).
    expect(matchCreateMock).toHaveBeenCalledTimes(3);
    // The bye match is created already decided.
    expect(matchCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "WALKOVER",
          winnerTeamId: expect.any(String),
        }),
      }),
    );
    // Its winner is propagated into the next match's slot.
    expect(matchUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: expect.any(String) },
        data: expect.objectContaining({
          teamAId: expect.any(String),
        }),
      }),
    );
  });

  it("skips the bracket entirely and crowns a trivial champion for exactly one qualifier", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      ...CATEGORY_ROW,
      groups: [CATEGORY_ROW.groups[0]],
    });
    matchCountMock.mockResolvedValue(0);
    matchFindManyMock.mockResolvedValue([]);
    categoryFindManyMock.mockResolvedValue([{ status: "COMPLETED" }]);

    await generateKnockoutBracket("cat_1", "club_1", "owner_1");

    expect(matchCreateMock).not.toHaveBeenCalled();
    expect(teamUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "t1" },
        data: { status: "CHAMPION" },
      }),
    );
    expect(categoryUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cat_1" },
        data: { status: "COMPLETED" },
      }),
    );
  });
});
