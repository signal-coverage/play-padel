import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  categoryFindUniqueMock,
  teamFindManyMock,
  teamUpdateManyMock,
  groupCountMock,
  groupCreateMock,
  groupDeleteManyMock,
  groupFindManyMock,
  matchDeleteManyMock,
  matchCreateManyMock,
  categoryUpdateMock,
  userFindUniqueMock,
  transactionMock,
} = vi.hoisted(() => ({
  categoryFindUniqueMock: vi.fn(),
  teamFindManyMock: vi.fn(),
  teamUpdateManyMock: vi.fn(),
  groupCountMock: vi.fn(),
  groupCreateMock: vi.fn(),
  groupDeleteManyMock: vi.fn(),
  groupFindManyMock: vi.fn(),
  matchDeleteManyMock: vi.fn(),
  matchCreateManyMock: vi.fn(),
  categoryUpdateMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/infrastructure/db/client", () => ({
  prisma: {
    tournamentCategory: {
      findUnique: categoryFindUniqueMock,
      update: categoryUpdateMock,
    },
    tournamentTeam: {
      findMany: teamFindManyMock,
      updateMany: teamUpdateManyMock,
    },
    tournamentGroup: {
      count: groupCountMock,
      create: groupCreateMock,
      deleteMany: groupDeleteManyMock,
      findMany: groupFindManyMock,
    },
    tournamentMatch: {
      deleteMany: matchDeleteManyMock,
      createMany: matchCreateManyMock,
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
  setGroupsManually,
  generateGroupsAutomatically,
  lockGroups,
  listGroupsForCategory,
} from "./groups.service";

const NOW = new Date();

const CATEGORY = {
  id: "cat_1",
  tournamentId: "tourney_1",
  name: "Category A",
  status: "REGISTRATION_CLOSED",
  groupCount: 2,
  advancesPerGroup: 2,
  createdAt: NOW,
  updatedAt: NOW,
  tournament: { id: "tourney_1", clubId: "club_1" },
};

function mockTx() {
  return {
    tournamentMatch: {
      deleteMany: matchDeleteManyMock,
      createMany: matchCreateManyMock,
    },
    tournamentGroup: {
      deleteMany: groupDeleteManyMock,
      create: groupCreateMock,
    },
    tournamentTeam: {
      updateMany: teamUpdateManyMock,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  userFindUniqueMock.mockResolvedValue({ displayName: "Owner" });
  transactionMock.mockImplementation(async (callback) => callback(mockTx()));
});

describe("setGroupsManually", () => {
  it("throws when the category doesn't exist", async () => {
    categoryFindUniqueMock.mockResolvedValue(null);

    await expect(
      setGroupsManually(
        "cat_1",
        [{ groupName: "A", teamIds: ["t1"] }],
        "owner_1",
      ),
    ).rejects.toThrow("not found");
  });

  it("throws when groups are already locked", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      ...CATEGORY,
      status: "GROUPS_LOCKED",
    });

    await expect(
      setGroupsManually(
        "cat_1",
        [{ groupName: "A", teamIds: ["t1"] }],
        "owner_1",
      ),
    ).rejects.toThrow("already been locked");
  });

  it("throws when a team doesn't belong to this category", async () => {
    categoryFindUniqueMock.mockResolvedValue(CATEGORY);
    teamFindManyMock.mockResolvedValue([{ id: "t1", groupId: null }]);

    await expect(
      setGroupsManually(
        "cat_1",
        [{ groupName: "A", teamIds: ["t1", "t2"] }],
        "owner_1",
      ),
    ).rejects.toThrow("do not belong");
  });

  it("throws when a team is already assigned to a group", async () => {
    categoryFindUniqueMock.mockResolvedValue(CATEGORY);
    teamFindManyMock.mockResolvedValue([
      { id: "t1", groupId: "group_existing" },
      { id: "t2", groupId: null },
    ]);

    await expect(
      setGroupsManually(
        "cat_1",
        [{ groupName: "A", teamIds: ["t1", "t2"] }],
        "owner_1",
      ),
    ).rejects.toThrow("already assigned");
  });

  it("throws when the same team appears in more than one group", async () => {
    categoryFindUniqueMock.mockResolvedValue(CATEGORY);

    await expect(
      setGroupsManually(
        "cat_1",
        [
          { groupName: "A", teamIds: ["t1"] },
          { groupName: "B", teamIds: ["t1"] },
        ],
        "owner_1",
      ),
    ).rejects.toThrow("more than one group");
  });

  it("creates groups, assigns teams, and generates round-robin matches", async () => {
    categoryFindUniqueMock.mockResolvedValue(CATEGORY);
    teamFindManyMock.mockResolvedValue([
      { id: "t1", groupId: null },
      { id: "t2", groupId: null },
      { id: "t3", groupId: null },
    ]);
    groupCreateMock
      .mockResolvedValueOnce({ id: "group_a", name: "A", position: 0 })
      .mockResolvedValueOnce({ id: "group_b", name: "B", position: 1 });

    await setGroupsManually(
      "cat_1",
      [
        { groupName: "A", teamIds: ["t1", "t2"] },
        { groupName: "B", teamIds: ["t3"] },
      ],
      "owner_1",
    );

    expect(matchDeleteManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentCategoryId: "cat_1", stage: "GROUP" },
      }),
    );
    expect(groupDeleteManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tournamentCategoryId: "cat_1" } }),
    );
    expect(groupCreateMock).toHaveBeenCalledTimes(2);
    expect(teamUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["t1", "t2"] } },
        data: { groupId: "group_a" },
      }),
    );
    // Group A (2 teams) gets exactly 1 round-robin match; group B (1 team)
    // gets none, so createMany should have been called only once overall.
    expect(matchCreateManyMock).toHaveBeenCalledTimes(1);
    expect(matchCreateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            tournamentCategoryId: "cat_1",
            groupId: "group_a",
            stage: "GROUP",
            status: "SCHEDULED",
            teamAId: "t1",
            teamBId: "t2",
          }),
        ],
      }),
    );
  });
});

describe("generateGroupsAutomatically", () => {
  it("throws when the category doesn't exist", async () => {
    categoryFindUniqueMock.mockResolvedValue(null);

    await expect(
      generateGroupsAutomatically("cat_1", "owner_1"),
    ).rejects.toThrow("not found");
  });

  it("throws when there are no registered teams", async () => {
    categoryFindUniqueMock.mockResolvedValue(CATEGORY);
    teamFindManyMock.mockResolvedValue([]);

    await expect(
      generateGroupsAutomatically("cat_1", "owner_1"),
    ).rejects.toThrow("no registered teams");
  });

  it("distributes registered teams via serpentine seeding and persists groups", async () => {
    categoryFindUniqueMock.mockResolvedValue(CATEGORY);
    teamFindManyMock.mockResolvedValue([
      { id: "t1", combinedCategoryLevel: 1 },
      { id: "t2", combinedCategoryLevel: 2 },
      { id: "t3", combinedCategoryLevel: 3 },
      { id: "t4", combinedCategoryLevel: 4 },
    ]);
    groupCreateMock
      .mockResolvedValueOnce({ id: "group_a", name: "Group A", position: 0 })
      .mockResolvedValueOnce({ id: "group_b", name: "Group B", position: 1 });

    await generateGroupsAutomatically("cat_1", "owner_1");

    expect(teamFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentCategoryId: "cat_1", status: "REGISTERED" },
      }),
    );
    expect(groupCreateMock).toHaveBeenCalledTimes(2);
    // Serpentine over 2 groups, 4 teams ascending: 0,1,1,0 -> group A = t1,t4; group B = t2,t3
    expect(teamUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["t1", "t4"] } },
        data: { groupId: "group_a" },
      }),
    );
    expect(teamUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["t2", "t3"] } },
        data: { groupId: "group_b" },
      }),
    );
  });
});

describe("lockGroups", () => {
  it("throws when the category doesn't exist", async () => {
    categoryFindUniqueMock.mockResolvedValue(null);
    await expect(lockGroups("cat_1", "owner_1")).rejects.toThrow("not found");
  });

  it("throws when already locked", async () => {
    categoryFindUniqueMock.mockResolvedValue({
      ...CATEGORY,
      status: "GROUPS_LOCKED",
    });
    await expect(lockGroups("cat_1", "owner_1")).rejects.toThrow(
      "already been locked",
    );
  });

  it("throws when there are zero groups", async () => {
    categoryFindUniqueMock.mockResolvedValue(CATEGORY);
    groupCountMock.mockResolvedValue(0);

    await expect(lockGroups("cat_1", "owner_1")).rejects.toThrow(
      "Create groups before locking",
    );
  });

  it("locks the category once groups exist", async () => {
    categoryFindUniqueMock.mockResolvedValue(CATEGORY);
    groupCountMock.mockResolvedValue(2);
    categoryUpdateMock.mockResolvedValue({
      ...CATEGORY,
      status: "GROUPS_LOCKED",
    });

    await lockGroups("cat_1", "owner_1");

    expect(categoryUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cat_1" },
        data: expect.objectContaining({ status: "GROUPS_LOCKED" }),
      }),
    );
  });
});

describe("listGroupsForCategory", () => {
  it("lists groups with their teams' ids, ordered by position", async () => {
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

    const result = await listGroupsForCategory("cat_1");

    expect(groupFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentCategoryId: "cat_1" },
        orderBy: { position: "asc" },
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "group_a",
        name: "Group A",
        teamIds: ["t1", "t2"],
      }),
    ]);
  });
});
