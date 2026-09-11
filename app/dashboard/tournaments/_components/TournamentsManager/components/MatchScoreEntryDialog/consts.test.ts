import { describe, it, expect } from "vitest";
import {
  matchScoreFormSchema,
  toMatchScoreSets,
  DEFAULT_VALUES,
} from "./consts";

describe("matchScoreFormSchema", () => {
  it("accepts a 2-0 sweep with set 3 left empty", () => {
    const result = matchScoreFormSchema.safeParse({
      set1TeamAGames: 6,
      set1TeamBGames: 4,
      set2TeamAGames: 6,
      set2TeamBGames: 2,
      set3TeamAGames: "",
      set3TeamBGames: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a 2-0 sweep with set 3 filled in anyway", () => {
    const result = matchScoreFormSchema.safeParse({
      set1TeamAGames: 6,
      set1TeamBGames: 4,
      set2TeamAGames: 6,
      set2TeamBGames: 2,
      set3TeamAGames: "6",
      set3TeamBGames: "4",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a 1-1 split with set 3 left empty", () => {
    const result = matchScoreFormSchema.safeParse({
      set1TeamAGames: 6,
      set1TeamBGames: 4,
      set2TeamAGames: 3,
      set2TeamBGames: 6,
      set3TeamAGames: "",
      set3TeamBGames: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a 1-1 split with set 3 filled in", () => {
    const result = matchScoreFormSchema.safeParse({
      set1TeamAGames: 6,
      set1TeamBGames: 4,
      set2TeamAGames: 3,
      set2TeamBGames: 6,
      set3TeamAGames: "7",
      set3TeamBGames: "5",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative games", () => {
    const result = matchScoreFormSchema.safeParse({
      ...DEFAULT_VALUES,
      set1TeamAGames: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe("toMatchScoreSets", () => {
  it("omits set 3 when both fields are empty", () => {
    const sets = toMatchScoreSets({
      set1TeamAGames: 6,
      set1TeamBGames: 4,
      set2TeamAGames: 6,
      set2TeamBGames: 2,
      set3TeamAGames: "",
      set3TeamBGames: "",
    });
    expect(sets).toEqual([
      { setNumber: 1, teamAGames: 6, teamBGames: 4 },
      { setNumber: 2, teamAGames: 6, teamBGames: 2 },
    ]);
  });

  it("includes set 3 when filled in", () => {
    const sets = toMatchScoreSets({
      set1TeamAGames: 6,
      set1TeamBGames: 4,
      set2TeamAGames: 3,
      set2TeamBGames: 6,
      set3TeamAGames: "7",
      set3TeamBGames: "5",
    });
    expect(sets).toEqual([
      { setNumber: 1, teamAGames: 6, teamBGames: 4 },
      { setNumber: 2, teamAGames: 3, teamBGames: 6 },
      { setNumber: 3, teamAGames: 7, teamBGames: 5 },
    ]);
  });
});
