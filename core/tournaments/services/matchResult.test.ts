import { describe, it, expect } from "vitest";
import { deriveMatchResult } from "./matchResult";

describe("deriveMatchResult", () => {
  it("is incomplete with zero sets", () => {
    const result = deriveMatchResult([]);
    expect(result).toEqual({
      winner: null,
      setsWonA: 0,
      setsWonB: 0,
      gamesWonA: 0,
      gamesWonB: 0,
      isComplete: false,
    });
  });

  it("is incomplete after one set won by A", () => {
    const result = deriveMatchResult([
      { setNumber: 1, teamAGames: 6, teamBGames: 4 },
    ]);
    expect(result.isComplete).toBe(false);
    expect(result.winner).toBeNull();
    expect(result.setsWonA).toBe(1);
    expect(result.setsWonB).toBe(0);
    expect(result.gamesWonA).toBe(6);
    expect(result.gamesWonB).toBe(4);
  });

  it("is incomplete after a 1-1 split", () => {
    const result = deriveMatchResult([
      { setNumber: 1, teamAGames: 6, teamBGames: 4 },
      { setNumber: 2, teamAGames: 3, teamBGames: 6 },
    ]);
    expect(result.isComplete).toBe(false);
    expect(result.winner).toBeNull();
    expect(result.setsWonA).toBe(1);
    expect(result.setsWonB).toBe(1);
  });

  it("declares A the winner after a 2-0 sweep", () => {
    const result = deriveMatchResult([
      { setNumber: 1, teamAGames: 6, teamBGames: 4 },
      { setNumber: 2, teamAGames: 6, teamBGames: 2 },
    ]);
    expect(result.isComplete).toBe(true);
    expect(result.winner).toBe("A");
    expect(result.setsWonA).toBe(2);
    expect(result.setsWonB).toBe(0);
    expect(result.gamesWonA).toBe(12);
    expect(result.gamesWonB).toBe(6);
  });

  it("declares B the winner after 2-1 in a full best-of-3", () => {
    const result = deriveMatchResult([
      { setNumber: 1, teamAGames: 6, teamBGames: 4 },
      { setNumber: 2, teamAGames: 3, teamBGames: 6 },
      { setNumber: 3, teamAGames: 2, teamBGames: 6 },
    ]);
    expect(result.isComplete).toBe(true);
    expect(result.winner).toBe("B");
    expect(result.setsWonA).toBe(1);
    expect(result.setsWonB).toBe(2);
    expect(result.gamesWonA).toBe(11);
    expect(result.gamesWonB).toBe(16);
  });

  it("does not enforce exact tennis/padel set scores (short sets allowed)", () => {
    const result = deriveMatchResult([
      { setNumber: 1, teamAGames: 4, teamBGames: 2 },
      { setNumber: 2, teamAGames: 4, teamBGames: 1 },
    ]);
    expect(result.isComplete).toBe(true);
    expect(result.winner).toBe("A");
  });

  it("treats a tied set (no strict majority) as won by neither side", () => {
    const result = deriveMatchResult([
      { setNumber: 1, teamAGames: 6, teamBGames: 6 },
    ]);
    expect(result.setsWonA).toBe(0);
    expect(result.setsWonB).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.winner).toBeNull();
  });

  it("rejects/ignores malformed input with more than 3 sets", () => {
    const result = deriveMatchResult([
      { setNumber: 1, teamAGames: 6, teamBGames: 4 },
      { setNumber: 2, teamAGames: 3, teamBGames: 6 },
      { setNumber: 3, teamAGames: 6, teamBGames: 4 },
      { setNumber: 4, teamAGames: 3, teamBGames: 6 },
    ]);
    expect(result.winner).toBeNull();
    expect(result.isComplete).toBe(false);
  });

  it("rejects/ignores sets continuing after a side already won 2 sets", () => {
    const result = deriveMatchResult([
      { setNumber: 1, teamAGames: 6, teamBGames: 4 },
      { setNumber: 2, teamAGames: 6, teamBGames: 4 },
      { setNumber: 3, teamAGames: 2, teamBGames: 6 },
      { setNumber: 4, teamAGames: 2, teamBGames: 6 },
    ]);
    expect(result.winner).toBeNull();
    expect(result.isComplete).toBe(false);
  });
});
