import { describe, it, expect } from "vitest";
import { generateRoundRobinMatches } from "./groupMatchGenerator";

describe("generateRoundRobinMatches", () => {
  it("returns an empty array for an empty group", () => {
    expect(generateRoundRobinMatches([])).toEqual([]);
  });

  it("returns no matches for a single team", () => {
    expect(generateRoundRobinMatches(["team_1"])).toEqual([]);
  });

  it("pairs exactly two teams once", () => {
    expect(generateRoundRobinMatches(["team_1", "team_2"])).toEqual([
      { teamAId: "team_1", teamBId: "team_2" },
    ]);
  });

  it("generates every unique pair with no repeats and no self-pairing", () => {
    const teamIds = ["team_1", "team_2", "team_3", "team_4"];
    const matches = generateRoundRobinMatches(teamIds);

    // C(4,2) = 6 unique pairings
    expect(matches).toHaveLength(6);

    for (const match of matches) {
      expect(match.teamAId).not.toBe(match.teamBId);
    }

    const pairKeys = matches.map((m) =>
      [m.teamAId, m.teamBId].sort().join("|"),
    );
    expect(new Set(pairKeys).size).toBe(pairKeys.length);

    // Every team appears against every other team exactly once.
    for (const teamId of teamIds) {
      const opponents = matches
        .filter((m) => m.teamAId === teamId || m.teamBId === teamId)
        .map((m) => (m.teamAId === teamId ? m.teamBId : m.teamAId));
      expect(new Set(opponents)).toEqual(
        new Set(teamIds.filter((id) => id !== teamId)),
      );
    }
  });

  it("gives an odd team one fewer pairing instead of a bye row", () => {
    const teamIds = ["team_1", "team_2", "team_3"];
    const matches = generateRoundRobinMatches(teamIds);

    // C(3,2) = 3 unique pairings, no bye/placeholder rows.
    expect(matches).toHaveLength(3);
    for (const match of matches) {
      expect(match.teamAId).toBeTruthy();
      expect(match.teamBId).toBeTruthy();
    }
  });
});
