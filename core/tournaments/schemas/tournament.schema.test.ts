import { describe, it, expect } from "vitest";
import {
  createTournamentCategorySchema,
  createTournamentSchema,
  updateTournamentSchema,
  registerTeamSchema,
  setGroupsSchema,
  enterMatchScoreSchema,
  recordWalkoverSchema,
} from "./tournament.schema";

const validCategory = {
  name: "Category A",
  groupCount: 2,
  advancesPerGroup: 2,
};

const validTournament = {
  name: "Summer Open",
  registrationOpensAt: new Date(Date.now() + 60_000).toISOString(),
  registrationClosesAt: new Date(Date.now() + 120_000).toISOString(),
  categories: [validCategory],
};

describe("createTournamentCategorySchema", () => {
  it("accepts a minimal valid category", () => {
    expect(
      createTournamentCategorySchema.safeParse(validCategory).success,
    ).toBe(true);
  });

  it("rejects a non-positive groupCount", () => {
    const result = createTournamentCategorySchema.safeParse({
      ...validCategory,
      groupCount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects minCategoryLevel greater than maxCategoryLevel", () => {
    const result = createTournamentCategorySchema.safeParse({
      ...validCategory,
      minCategoryLevel: 5,
      maxCategoryLevel: 3,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a category level outside the 1-8 range", () => {
    const result = createTournamentCategorySchema.safeParse({
      ...validCategory,
      minCategoryLevel: 9,
    });
    expect(result.success).toBe(false);
  });
});

describe("createTournamentSchema", () => {
  it("accepts a minimal valid tournament with one category", () => {
    expect(createTournamentSchema.safeParse(validTournament).success).toBe(
      true,
    );
  });

  it("rejects an empty categories array", () => {
    const result = createTournamentSchema.safeParse({
      ...validTournament,
      categories: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects registrationClosesAt before registrationOpensAt", () => {
    const result = createTournamentSchema.safeParse({
      ...validTournament,
      registrationOpensAt: new Date(Date.now() + 120_000).toISOString(),
      registrationClosesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects endDate before startDate", () => {
    const result = createTournamentSchema.safeParse({
      ...validTournament,
      startDate: new Date(Date.now() + 200_000).toISOString(),
      endDate: new Date(Date.now() + 100_000).toISOString(),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTournamentSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(updateTournamentSchema.safeParse({}).success).toBe(true);
  });

  it("rejects registrationClosesAt before registrationOpensAt when both given", () => {
    const result = updateTournamentSchema.safeParse({
      registrationOpensAt: new Date(Date.now() + 120_000).toISOString(),
      registrationClosesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(result.success).toBe(false);
  });
});

describe("registerTeamSchema", () => {
  it("accepts a valid partnerId", () => {
    expect(registerTeamSchema.safeParse({ partnerId: "p1" }).success).toBe(
      true,
    );
  });

  it("rejects a missing partnerId", () => {
    expect(registerTeamSchema.safeParse({}).success).toBe(false);
  });
});

describe("setGroupsSchema", () => {
  it("accepts a valid manual payload", () => {
    const result = setGroupsSchema.safeParse({
      mode: "manual",
      groups: [{ groupName: "Group A", teamIds: ["t1", "t2"] }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid auto payload with no groups field", () => {
    expect(setGroupsSchema.safeParse({ mode: "auto" }).success).toBe(true);
  });

  it("rejects manual mode with zero groups", () => {
    const result = setGroupsSchema.safeParse({ mode: "manual", groups: [] });
    expect(result.success).toBe(false);
  });

  it("rejects manual mode with a group that has zero teams", () => {
    const result = setGroupsSchema.safeParse({
      mode: "manual",
      groups: [{ groupName: "Group A", teamIds: [] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown mode", () => {
    const result = setGroupsSchema.safeParse({ mode: "bogus" });
    expect(result.success).toBe(false);
  });
});

describe("enterMatchScoreSchema", () => {
  it("accepts 2 valid sets", () => {
    const result = enterMatchScoreSchema.safeParse({
      sets: [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 6, teamBGames: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero sets", () => {
    expect(enterMatchScoreSchema.safeParse({ sets: [] }).success).toBe(false);
  });

  it("rejects more than 3 sets", () => {
    const result = enterMatchScoreSchema.safeParse({
      sets: [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 6, teamBGames: 4 },
        { setNumber: 3, teamAGames: 6, teamBGames: 4 },
        { setNumber: 4, teamAGames: 6, teamBGames: 4 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative games", () => {
    const result = enterMatchScoreSchema.safeParse({
      sets: [{ setNumber: 1, teamAGames: -1, teamBGames: 4 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("recordWalkoverSchema", () => {
  it("accepts a valid winningTeamId", () => {
    expect(
      recordWalkoverSchema.safeParse({ winningTeamId: "team_1" }).success,
    ).toBe(true);
  });

  it("rejects a missing winningTeamId", () => {
    expect(recordWalkoverSchema.safeParse({}).success).toBe(false);
  });
});
