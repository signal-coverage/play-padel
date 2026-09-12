import { describe, it, expect } from "vitest";
import { distributeTeamsIntoGroups } from "./groupDistribution";

function byGroup(
  assignments: { groupIndex: number; teamId: string }[],
): Record<number, string[]> {
  const result: Record<number, string[]> = {};
  for (const { groupIndex, teamId } of assignments) {
    (result[groupIndex] ??= []).push(teamId);
  }
  return result;
}

describe("distributeTeamsIntoGroups", () => {
  it("returns an empty array for no teams", () => {
    expect(distributeTeamsIntoGroups([], 2)).toEqual([]);
  });

  it("puts every team into exactly one group", () => {
    const teams = [
      { id: "t1", combinedCategoryLevel: 1 },
      { id: "t2", combinedCategoryLevel: 2 },
      { id: "t3", combinedCategoryLevel: 3 },
      { id: "t4", combinedCategoryLevel: 4 },
    ];
    const assignments = distributeTeamsIntoGroups(teams, 2);
    expect(assignments).toHaveLength(4);
    expect(new Set(assignments.map((a) => a.teamId)).size).toBe(4);
  });

  it("seeds serpentine order across groups, strongest (lowest level) first", () => {
    // Ranking ascending by combinedCategoryLevel: t1(1) t2(2) t3(3) t4(4)
    // t5(5) t6(6). Serpentine into 2 groups: 0,1,1,0,0,1
    const teams = [
      { id: "t1", combinedCategoryLevel: 1 },
      { id: "t2", combinedCategoryLevel: 2 },
      { id: "t3", combinedCategoryLevel: 3 },
      { id: "t4", combinedCategoryLevel: 4 },
      { id: "t5", combinedCategoryLevel: 5 },
      { id: "t6", combinedCategoryLevel: 6 },
    ];
    const assignments = distributeTeamsIntoGroups(teams, 2);
    const groups = byGroup(assignments);

    expect(groups[0]).toEqual(["t1", "t4", "t5"]);
    expect(groups[1]).toEqual(["t2", "t3", "t6"]);
  });

  it("seeds serpentine order across 3 groups", () => {
    // ascending order: t1..t7 (levels 1..7). Serpentine pattern into 3
    // groups: 0,1,2,2,1,0,0
    const teams = Array.from({ length: 7 }, (_, i) => ({
      id: `t${i + 1}`,
      combinedCategoryLevel: i + 1,
    }));
    const assignments = distributeTeamsIntoGroups(teams, 3);
    const groups = byGroup(assignments);

    expect(groups[0]).toEqual(["t1", "t6", "t7"]);
    expect(groups[1]).toEqual(["t2", "t5"]);
    expect(groups[2]).toEqual(["t3", "t4"]);
  });

  it("sorts teams with a null combinedCategoryLevel last (unranked)", () => {
    const teams = [
      { id: "unranked_1", combinedCategoryLevel: null },
      { id: "t1", combinedCategoryLevel: 1 },
      { id: "unranked_2", combinedCategoryLevel: null },
      { id: "t2", combinedCategoryLevel: 2 },
    ];
    const assignments = distributeTeamsIntoGroups(teams, 2);
    const groups = byGroup(assignments);

    // Ranked ascending first: t1(1), t2(2), then unranked in original order.
    // Serpentine into 2 groups over 4 teams: 0,1,1,0
    expect(groups[0]).toEqual(["t1", "unranked_2"]);
    expect(groups[1]).toEqual(["t2", "unranked_1"]);
  });

  it("balances an odd team count without dropping anyone", () => {
    // Serpentine pattern for 2 groups: 0,1,1,0,... — the 3rd (leftover) team
    // continues the in-progress backward pass into group 1 alongside the
    // 2nd-ranked team, same as a standard snake draft's partial final round.
    const teams = [
      { id: "t1", combinedCategoryLevel: 1 },
      { id: "t2", combinedCategoryLevel: 2 },
      { id: "t3", combinedCategoryLevel: 3 },
    ];
    const assignments = distributeTeamsIntoGroups(teams, 2);
    expect(assignments).toHaveLength(3);
    const groups = byGroup(assignments);
    expect(groups[0]).toEqual(["t1"]);
    expect(groups[1]).toEqual(["t2", "t3"]);
  });
});
