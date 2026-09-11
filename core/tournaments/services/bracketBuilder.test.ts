import { describe, it, expect } from "vitest";
import { advanceWinner, buildKnockoutBracket } from "./bracketBuilder";

function seeds(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `seed_${i + 1}`);
}

describe("buildKnockoutBracket", () => {
  it("returns no matches for 0 teams", () => {
    expect(buildKnockoutBracket([])).toEqual([]);
  });

  it("returns no matches for 1 team (trivial champion)", () => {
    expect(buildKnockoutBracket(seeds(1))).toEqual([]);
  });

  it("builds a single FINAL match for exactly 2 teams (no byes)", () => {
    const bracket = buildKnockoutBracket(seeds(2));
    expect(bracket).toHaveLength(1);
    expect(bracket[0]).toEqual({
      round: "FINAL",
      seedIndexA: 0,
      seedIndexB: 1,
      isBye: false,
      nextMatchIndex: null,
      nextMatchSlot: null,
    });
  });

  it("builds SEMIFINAL x2 + FINAL for exactly 4 teams (no byes)", () => {
    const bracket = buildKnockoutBracket(seeds(4));
    expect(bracket).toHaveLength(3);
    expect(bracket.map((m) => m.round)).toEqual([
      "SEMIFINAL",
      "SEMIFINAL",
      "FINAL",
    ]);
    expect(bracket.every((m) => !m.isBye)).toBe(true);
    // Every seed appears exactly once across round-1 matches.
    const round1 = bracket.slice(0, 2);
    const usedSeeds = round1.flatMap((m) => [m.seedIndexA, m.seedIndexB]);
    expect(new Set(usedSeeds)).toEqual(new Set([0, 1, 2, 3]));
    // Both semifinal winners feed into the single FINAL, one per slot.
    expect(round1[0].nextMatchIndex).toBe(2);
    expect(round1[1].nextMatchIndex).toBe(2);
    expect([round1[0].nextMatchSlot, round1[1].nextMatchSlot].sort()).toEqual([
      "A",
      "B",
    ]);
    expect(bracket[2].nextMatchIndex).toBeNull();
    expect(bracket[2].nextMatchSlot).toBeNull();
  });

  it("builds QUARTERFINAL x4 + SEMIFINAL x2 + FINAL for exactly 8 teams (no byes)", () => {
    const bracket = buildKnockoutBracket(seeds(8));
    expect(bracket).toHaveLength(7);
    expect(bracket.map((m) => m.round)).toEqual([
      "QUARTERFINAL",
      "QUARTERFINAL",
      "QUARTERFINAL",
      "QUARTERFINAL",
      "SEMIFINAL",
      "SEMIFINAL",
      "FINAL",
    ]);
    expect(bracket.every((m) => !m.isBye)).toBe(true);
    // Standard bracket seeding for 8: 1v8, 4v5, 2v7, 3v6 (0-indexed: 0v7,3v4,1v6,2v5).
    expect([bracket[0].seedIndexA, bracket[0].seedIndexB].sort()).toEqual([
      0, 7,
    ]);
    expect([bracket[1].seedIndexA, bracket[1].seedIndexB].sort()).toEqual([
      3, 4,
    ]);
    expect([bracket[2].seedIndexA, bracket[2].seedIndexB].sort()).toEqual([
      1, 6,
    ]);
    expect([bracket[3].seedIndexA, bracket[3].seedIndexB].sort()).toEqual([
      2, 5,
    ]);
    // Top seed (index 0) and seed index 1 can only meet in the FINAL — they
    // sit in opposite halves of the bracket.
    expect(bracket[0].nextMatchIndex).toBe(4);
    expect(bracket[2].nextMatchIndex).toBe(5);
    expect(bracket[4].nextMatchIndex).toBe(6);
    expect(bracket[5].nextMatchIndex).toBe(6);
  });

  it("builds the full ROUND_OF_16 -> ... -> FINAL label sequence for 16 teams", () => {
    const bracket = buildKnockoutBracket(seeds(16));
    expect(bracket).toHaveLength(15);
    const labelsByRound = [...new Set(bracket.map((m) => m.round))];
    expect(labelsByRound).toEqual([
      "ROUND_OF_16",
      "QUARTERFINAL",
      "SEMIFINAL",
      "FINAL",
    ]);
    expect(bracket.filter((m) => m.round === "ROUND_OF_16")).toHaveLength(8);
    expect(bracket.filter((m) => m.round === "QUARTERFINAL")).toHaveLength(4);
    expect(bracket.filter((m) => m.round === "SEMIFINAL")).toHaveLength(2);
    expect(bracket.filter((m) => m.round === "FINAL")).toHaveLength(1);
  });

  it("gives the single top seed a bye for 3 teams", () => {
    const bracket = buildKnockoutBracket(seeds(3));
    // bracketSize=4: SEMIFINAL x2 + FINAL.
    expect(bracket).toHaveLength(3);
    const semis = bracket.slice(0, 2);
    const byeMatches = semis.filter((m) => m.isBye);
    const realMatches = semis.filter((m) => !m.isBye);
    expect(byeMatches).toHaveLength(1);
    expect(realMatches).toHaveLength(1);
    // The bye goes to seed index 0 (the top/strongest seed).
    expect(byeMatches[0].seedIndexA).toBe(0);
    expect(byeMatches[0].seedIndexB).toBeUndefined();
    // The real match is between the two remaining seeds (1 and 2).
    expect(
      [realMatches[0].seedIndexA, realMatches[0].seedIndexB].sort(),
    ).toEqual([1, 2]);
  });

  it("gives the top 3 seeds byes for 5 teams (bracketSize 8)", () => {
    const bracket = buildKnockoutBracket(seeds(5));
    const round1 = bracket.filter((m) => m.round === "QUARTERFINAL");
    expect(round1).toHaveLength(4);
    const byeMatches = round1.filter((m) => m.isBye);
    const realMatches = round1.filter((m) => !m.isBye);
    expect(byeMatches).toHaveLength(3);
    expect(realMatches).toHaveLength(1);
    const byeSeeds = byeMatches
      .map((m) => m.seedIndexA)
      .filter((s): s is number => s !== undefined)
      .sort((a, b) => a - b);
    expect(byeSeeds).toEqual([0, 1, 2]);
    expect(
      [realMatches[0].seedIndexA, realMatches[0].seedIndexB].sort(),
    ).toEqual([3, 4]);
  });

  it("gives the top 2 seeds byes for 6 teams (bracketSize 8)", () => {
    const bracket = buildKnockoutBracket(seeds(6));
    const round1 = bracket.filter((m) => m.round === "QUARTERFINAL");
    expect(round1).toHaveLength(4);
    const byeMatches = round1.filter((m) => m.isBye);
    const realMatches = round1.filter((m) => !m.isBye);
    expect(byeMatches).toHaveLength(2);
    expect(realMatches).toHaveLength(2);
    const byeSeeds = byeMatches
      .map((m) => m.seedIndexA)
      .filter((s): s is number => s !== undefined)
      .sort((a, b) => a - b);
    expect(byeSeeds).toEqual([0, 1]);
  });

  it("gives only the top seed a bye for 7 teams (bracketSize 8)", () => {
    const bracket = buildKnockoutBracket(seeds(7));
    const round1 = bracket.filter((m) => m.round === "QUARTERFINAL");
    expect(round1).toHaveLength(4);
    const byeMatches = round1.filter((m) => m.isBye);
    const realMatches = round1.filter((m) => !m.isBye);
    expect(byeMatches).toHaveLength(1);
    expect(realMatches).toHaveLength(3);
    expect(byeMatches[0].seedIndexA).toBe(0);
  });

  it("never pairs two byes together", () => {
    for (const n of [3, 5, 6, 7, 9, 12, 13]) {
      const bracket = buildKnockoutBracket(seeds(n));
      const firstRoundLabel = bracket[0]?.round;
      const round1 = bracket.filter((m) => m.round === firstRoundLabel);
      for (const match of round1) {
        const hasA = match.seedIndexA !== undefined;
        const hasB = match.seedIndexB !== undefined;
        expect(hasA || hasB).toBe(true); // never a match with neither seed set
      }
    }
  });

  it("caps out at ROUND_OF_32 for a 32-team category", () => {
    const bracket = buildKnockoutBracket(seeds(32));
    expect(bracket).toHaveLength(31);
    expect(bracket.filter((m) => m.round === "ROUND_OF_32")).toHaveLength(16);
    expect(bracket.filter((m) => m.round === "FINAL")).toHaveLength(1);
  });
});

describe("advanceWinner", () => {
  it("returns the next match id and slot when one exists", () => {
    const result = advanceWinner(
      { nextMatchId: "match_2", nextMatchSlot: "A" },
      "team_1",
    );
    expect(result).toEqual({ matchId: "match_2", slot: "A" });
  });

  it("returns null when there is no next match (the FINAL)", () => {
    const result = advanceWinner(
      { nextMatchId: null, nextMatchSlot: null },
      "team_1",
    );
    expect(result).toBeNull();
  });

  it("returns null when winnerTeamId is falsy", () => {
    const result = advanceWinner(
      { nextMatchId: "match_2", nextMatchSlot: "A" },
      "",
    );
    expect(result).toBeNull();
  });
});
