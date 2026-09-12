import { describe, it, expect } from "vitest";
import { computeStandingsFromMatches } from "./standingsCalculator";

describe("computeStandingsFromMatches", () => {
  it("returns a zeroed row per team when there are no matches", () => {
    const teams = [{ id: "t1" }, { id: "t2" }];
    const rows = computeStandingsFromMatches(teams, []);

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.wins).toBe(0);
      expect(row.setsWon).toBe(0);
      expect(row.setsLost).toBe(0);
      expect(row.gamesWon).toBe(0);
      expect(row.gamesLost).toBe(0);
    }
  });

  it("counts wins/losses and set/game differentials from completed matches", () => {
    const teams = [{ id: "t1" }, { id: "t2" }, { id: "t3" }];
    const matches = [
      {
        teamAId: "t1",
        teamBId: "t2",
        status: "COMPLETED" as const,
        winnerTeamId: "t1",
        setsWonA: 2,
        setsWonB: 0,
        gamesWonA: 12,
        gamesWonB: 6,
      },
      {
        teamAId: "t1",
        teamBId: "t3",
        status: "COMPLETED" as const,
        winnerTeamId: "t3",
        setsWonA: 1,
        setsWonB: 2,
        gamesWonA: 10,
        gamesWonB: 12,
      },
    ];
    const rows = computeStandingsFromMatches(teams, matches);
    const byId = Object.fromEntries(rows.map((r) => [r.teamId, r]));

    expect(byId.t1.wins).toBe(1);
    expect(byId.t1.setsWon).toBe(3);
    expect(byId.t1.setsLost).toBe(2);
    expect(byId.t1.gamesWon).toBe(22);
    expect(byId.t1.gamesLost).toBe(18);

    expect(byId.t2.wins).toBe(0);
    expect(byId.t2.setsWon).toBe(0);
    expect(byId.t2.setsLost).toBe(2);

    expect(byId.t3.wins).toBe(1);
    expect(byId.t3.setsWon).toBe(2);
    expect(byId.t3.setsLost).toBe(1);
  });

  it("counts a WALKOVER match toward the winner's tally", () => {
    const teams = [{ id: "t1" }, { id: "t2" }];
    const matches = [
      {
        teamAId: "t1",
        teamBId: "t2",
        status: "WALKOVER" as const,
        winnerTeamId: "t1",
      },
    ];
    const rows = computeStandingsFromMatches(teams, matches);
    const byId = Object.fromEntries(rows.map((r) => [r.teamId, r]));

    expect(byId.t1.wins).toBe(1);
    expect(byId.t2.wins).toBe(0);
  });

  it("sorts by match wins descending first", () => {
    const teams = [{ id: "t1" }, { id: "t2" }, { id: "t3" }];
    const matches = [
      {
        teamAId: "t1",
        teamBId: "t2",
        status: "COMPLETED" as const,
        winnerTeamId: "t1",
        setsWonA: 2,
        setsWonB: 0,
        gamesWonA: 12,
        gamesWonB: 4,
      },
      {
        teamAId: "t1",
        teamBId: "t3",
        status: "COMPLETED" as const,
        winnerTeamId: "t1",
        setsWonA: 2,
        setsWonB: 0,
        gamesWonA: 12,
        gamesWonB: 4,
      },
      {
        teamAId: "t2",
        teamBId: "t3",
        status: "COMPLETED" as const,
        winnerTeamId: "t2",
        setsWonA: 2,
        setsWonB: 1,
        gamesWonA: 12,
        gamesWonB: 10,
      },
    ];
    const rows = computeStandingsFromMatches(teams, matches);
    expect(rows.map((r) => r.teamId)).toEqual(["t1", "t2", "t3"]);
  });

  it("breaks a wins tie by set differential", () => {
    const teams = [{ id: "t1" }, { id: "t2" }];
    // Neither team has played each other; each has 1 win elsewhere, but t1's
    // win had a bigger set differential.
    const matches = [
      {
        teamAId: "t1",
        teamBId: "ghost1",
        status: "COMPLETED" as const,
        winnerTeamId: "t1",
        setsWonA: 2,
        setsWonB: 0,
        gamesWonA: 12,
        gamesWonB: 2,
      },
      {
        teamAId: "t2",
        teamBId: "ghost2",
        status: "COMPLETED" as const,
        winnerTeamId: "t2",
        setsWonA: 2,
        setsWonB: 1,
        gamesWonA: 12,
        gamesWonB: 11,
      },
    ];
    const rows = computeStandingsFromMatches(teams, matches);
    expect(rows.map((r) => r.teamId)).toEqual(["t1", "t2"]);
  });

  it("breaks a set-differential tie by game differential", () => {
    const teams = [{ id: "t1" }, { id: "t2" }];
    const matches = [
      {
        teamAId: "t1",
        teamBId: "ghost1",
        status: "COMPLETED" as const,
        winnerTeamId: "t1",
        setsWonA: 2,
        setsWonB: 0,
        gamesWonA: 12,
        gamesWonB: 2,
      },
      {
        teamAId: "t2",
        teamBId: "ghost2",
        status: "COMPLETED" as const,
        winnerTeamId: "t2",
        setsWonA: 2,
        setsWonB: 0,
        gamesWonA: 12,
        gamesWonB: 8,
      },
    ];
    const rows = computeStandingsFromMatches(teams, matches);
    expect(rows.map((r) => r.teamId)).toEqual(["t1", "t2"]);
  });

  it("uses head-to-head as the decisive tie-break for a genuine full tie", () => {
    // t1 and t2 end up with identical wins(1)/setDiff(0)/gameDiff(0) once all
    // matches (including their own head-to-head, which t2 won) are tallied —
    // isolating head-to-head as the only remaining discriminator.
    const teams = [{ id: "t1" }, { id: "t2" }];
    const matches = [
      {
        teamAId: "t1",
        teamBId: "t2",
        status: "COMPLETED" as const,
        winnerTeamId: "t2",
        setsWonA: 0,
        setsWonB: 2,
        gamesWonA: 4,
        gamesWonB: 12,
      },
      {
        teamAId: "t1",
        teamBId: "ghost1",
        status: "COMPLETED" as const,
        winnerTeamId: "t1",
        setsWonA: 2,
        setsWonB: 0,
        gamesWonA: 12,
        gamesWonB: 4,
      },
      {
        teamAId: "t2",
        teamBId: "ghost2",
        status: "COMPLETED" as const,
        winnerTeamId: "ghost2",
        setsWonA: 0,
        setsWonB: 2,
        gamesWonA: 4,
        gamesWonB: 12,
      },
    ];

    const rows = computeStandingsFromMatches(teams, matches);
    const byId = Object.fromEntries(rows.map((r) => [r.teamId, r]));
    expect(byId.t1.wins).toBe(1);
    expect(byId.t2.wins).toBe(1);
    expect(byId.t1.setsWon - byId.t1.setsLost).toBe(
      byId.t2.setsWon - byId.t2.setsLost,
    );
    expect(byId.t1.gamesWon - byId.t1.gamesLost).toBe(
      byId.t2.gamesWon - byId.t2.gamesLost,
    );

    expect(rows.map((r) => r.teamId)).toEqual(["t2", "t1"]);
  });
});

describe("computeStandingsFromMatches — deterministic fallback", () => {
  it("falls back to team id when everything ties and there's no head-to-head match", () => {
    const teams = [{ id: "z_team" }, { id: "a_team" }];
    const rows = computeStandingsFromMatches(teams, []);
    expect(rows.map((r) => r.teamId)).toEqual(["a_team", "z_team"]);
  });
});
