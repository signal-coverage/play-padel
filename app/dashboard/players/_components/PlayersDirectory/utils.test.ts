import { describe, expect, it } from "vitest";
import { filterPlayers, sortPlayers } from "./utils";
import type { PlayerFilters, PlayerListItem, PlayerSort } from "./types";

const NO_FILTERS: PlayerFilters = {
  category: "all",
  preferredSide: "all",
  dominantHand: "all",
};

function makePlayer(overrides: Partial<PlayerListItem>): PlayerListItem {
  return {
    id: "1",
    displayName: "Test Player",
    avatarUrl: null,
    padelCategory: null,
    preferredSide: null,
    dominantHand: null,
    email: "test@example.com",
    phone: null,
    ...overrides,
  };
}

describe("filterPlayers", () => {
  it("returns all players when query is empty and no filters are applied", () => {
    const players = [
      makePlayer({ id: "1", displayName: "Ana" }),
      makePlayer({ id: "2", displayName: "Beto" }),
    ];
    expect(filterPlayers(players, "", NO_FILTERS)).toHaveLength(2);
  });

  it("filters by name query, case-insensitively", () => {
    const players = [
      makePlayer({ id: "1", displayName: "Ana Gomez" }),
      makePlayer({ id: "2", displayName: "Beto Diaz" }),
    ];
    const result = filterPlayers(players, "ana", NO_FILTERS);
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it('matches category "unknown" against a null padelCategory', () => {
    const players = [
      makePlayer({ id: "1", padelCategory: null }),
      makePlayer({ id: "2", padelCategory: 3 }),
    ];
    const result = filterPlayers(players, "", {
      ...NO_FILTERS,
      category: "unknown",
    });
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it("matches a specific numeric category", () => {
    const players = [
      makePlayer({ id: "1", padelCategory: 3 }),
      makePlayer({ id: "2", padelCategory: 5 }),
    ];
    const result = filterPlayers(players, "", {
      ...NO_FILTERS,
      category: "3",
    });
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it("combines the name query with a preferredSide filter (AND logic)", () => {
    const players = [
      makePlayer({ id: "1", displayName: "Ana", preferredSide: "forehand" }),
      makePlayer({ id: "2", displayName: "Ana", preferredSide: "backhand" }),
    ];
    const result = filterPlayers(players, "ana", {
      ...NO_FILTERS,
      preferredSide: "forehand",
    });
    expect(result.map((p) => p.id)).toEqual(["1"]);
  });

  it("filters by dominantHand", () => {
    const players = [
      makePlayer({ id: "1", dominantHand: "right" }),
      makePlayer({ id: "2", dominantHand: "left" }),
    ];
    const result = filterPlayers(players, "", {
      ...NO_FILTERS,
      dominantHand: "left",
    });
    expect(result.map((p) => p.id)).toEqual(["2"]);
  });
});

describe("sortPlayers", () => {
  it("sorts by name ascending and descending", () => {
    const players = [
      makePlayer({ id: "1", displayName: "Beto" }),
      makePlayer({ id: "2", displayName: "Ana" }),
    ];
    const asc: PlayerSort = { field: "name", direction: "asc" };
    expect(sortPlayers(players, asc).map((p) => p.id)).toEqual(["2", "1"]);

    const desc: PlayerSort = { field: "name", direction: "desc" };
    expect(sortPlayers(players, desc).map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("sorts by category numerically, with null always last regardless of direction", () => {
    const players = [
      makePlayer({ id: "1", padelCategory: 5 }),
      makePlayer({ id: "2", padelCategory: null }),
      makePlayer({ id: "3", padelCategory: 2 }),
    ];
    const asc: PlayerSort = { field: "category", direction: "asc" };
    expect(sortPlayers(players, asc).map((p) => p.id)).toEqual(["3", "1", "2"]);

    const desc: PlayerSort = { field: "category", direction: "desc" };
    expect(sortPlayers(players, desc).map((p) => p.id)).toEqual([
      "1",
      "3",
      "2",
    ]);
  });

  it("sorts by preferredSide label, with null always last regardless of direction", () => {
    const players = [
      makePlayer({ id: "1", preferredSide: "forehand" }),
      makePlayer({ id: "2", preferredSide: null }),
      makePlayer({ id: "3", preferredSide: "backhand" }),
    ];
    // "Backhand" < "Forehand" alphabetically
    const asc: PlayerSort = { field: "preferredSide", direction: "asc" };
    expect(sortPlayers(players, asc).map((p) => p.id)).toEqual(["3", "1", "2"]);

    const desc: PlayerSort = { field: "preferredSide", direction: "desc" };
    expect(sortPlayers(players, desc).map((p) => p.id)).toEqual([
      "1",
      "3",
      "2",
    ]);
  });
});
