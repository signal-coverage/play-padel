import { describe, it, expect } from "vitest";
import { filterPlayerCandidates } from "./utils";
import type { PlayerCandidate } from "./types";

const PLAYERS: PlayerCandidate[] = [
  { id: "p1", displayName: "Ana Gómez", avatarUrl: null },
  { id: "p2", displayName: "Bruno Díaz", avatarUrl: null },
  { id: "me", displayName: "Me", avatarUrl: null },
];

describe("filterPlayerCandidates", () => {
  it("excludes the given excludeUserId", () => {
    const result = filterPlayerCandidates(PLAYERS, "", "me");
    expect(result.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("filters case-insensitively by displayName substring", () => {
    const result = filterPlayerCandidates(PLAYERS, "bruno", "me");
    expect(result.map((p) => p.id)).toEqual(["p2"]);
  });

  it("returns everyone (minus excludeUserId) when the query is empty", () => {
    const result = filterPlayerCandidates(PLAYERS, "", "me");
    expect(result).toHaveLength(2);
  });

  it("returns an empty array when nothing matches", () => {
    const result = filterPlayerCandidates(PLAYERS, "zzz", "me");
    expect(result).toEqual([]);
  });
});
