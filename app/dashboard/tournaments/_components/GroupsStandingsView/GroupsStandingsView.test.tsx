// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("./hooks", () => ({
  useCategoryStandingsDetail: vi.fn(),
}));

import { useCategoryStandingsDetail } from "./hooks";
import { GroupsStandingsView } from "./GroupsStandingsView";

const useCategoryStandingsDetailMock = useCategoryStandingsDetail as ReturnType<
  typeof vi.fn
>;

afterEach(cleanup);

describe("GroupsStandingsView", () => {
  it("shows a loading state", () => {
    useCategoryStandingsDetailMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<GroupsStandingsView tournamentId="t1" categoryId="c1" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders each group's matches/standings read-only, with no action buttons", () => {
    useCategoryStandingsDetailMock.mockReturnValue({
      isLoading: false,
      data: {
        groups: [
          {
            group: {
              id: "group_a",
              name: "Group A",
              position: 0,
              teamIds: ["t1", "t2"],
            },
            standings: [
              {
                teamId: "t1",
                wins: 1,
                setsWon: 2,
                setsLost: 0,
                gamesWon: 12,
                gamesLost: 6,
              },
            ],
            matches: [
              { id: "m1", teamAId: "t1", teamBId: "t2", status: "SCHEDULED" },
            ],
          },
        ],
        knockoutRounds: [],
        teams: [
          {
            id: "t1",
            player1DisplayName: "Alice",
            player2DisplayName: "Ana",
            status: "REGISTERED",
          },
          {
            id: "t2",
            player1DisplayName: "Bob",
            player2DisplayName: "Ben",
            status: "REGISTERED",
          },
        ],
      },
    });

    render(<GroupsStandingsView tournamentId="t1" categoryId="c1" />);

    expect(screen.getByText("Group A")).toBeInTheDocument();
    expect(screen.getByText("Alice / Ana vs Bob / Ben")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /enter score/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the knockout bracket read-only when it exists", () => {
    useCategoryStandingsDetailMock.mockReturnValue({
      isLoading: false,
      data: {
        groups: [],
        knockoutRounds: [
          {
            round: "FINAL",
            matches: [
              {
                id: "ko1",
                knockoutRound: "FINAL",
                teamAId: "t1",
                teamBId: "t2",
                status: "SCHEDULED",
              },
            ],
          },
        ],
        teams: [
          {
            id: "t1",
            player1DisplayName: "Alice",
            player2DisplayName: "Ana",
            status: "REGISTERED",
          },
          {
            id: "t2",
            player1DisplayName: "Bob",
            player2DisplayName: "Ben",
            status: "REGISTERED",
          },
        ],
      },
    });

    render(<GroupsStandingsView tournamentId="t1" categoryId="c1" />);

    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.getByText("Alice / Ana vs Bob / Ben")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /enter score/i }),
    ).not.toBeInTheDocument();
  });
});
