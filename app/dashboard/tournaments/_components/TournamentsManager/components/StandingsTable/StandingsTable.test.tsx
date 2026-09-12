// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { StandingsTable } from "./StandingsTable";

afterEach(cleanup);

describe("StandingsTable", () => {
  it("shows an empty state with no rows", () => {
    render(<StandingsTable rows={[]} teamLabels={{}} />);
    expect(screen.getByText(/no standings yet/i)).toBeInTheDocument();
  });

  it("renders one row per team with wins, set diff, and game diff", () => {
    render(
      <StandingsTable
        rows={[
          {
            teamId: "t1",
            wins: 2,
            setsWon: 4,
            setsLost: 0,
            gamesWon: 24,
            gamesLost: 10,
          },
          {
            teamId: "t2",
            wins: 0,
            setsWon: 0,
            setsLost: 4,
            gamesWon: 10,
            gamesLost: 24,
          },
        ]}
        teamLabels={{ t1: "Alice / Ana", t2: "Bob / Ben" }}
      />,
    );

    const rows = screen.getAllByRole("row");
    // header + 2 data rows
    expect(rows).toHaveLength(3);

    const firstDataRow = within(rows[1]);
    expect(firstDataRow.getByText("Alice / Ana")).toBeInTheDocument();
    expect(firstDataRow.getByText("2")).toBeInTheDocument();
    expect(firstDataRow.getByText("4")).toBeInTheDocument();
    expect(firstDataRow.getByText("14")).toBeInTheDocument();
  });

  it("falls back to the raw team id when no label is provided", () => {
    render(
      <StandingsTable
        rows={[
          {
            teamId: "team_unknown",
            wins: 0,
            setsWon: 0,
            setsLost: 0,
            gamesWon: 0,
            gamesLost: 0,
          },
        ]}
        teamLabels={{}}
      />,
    );
    expect(screen.getByText("team_unknown")).toBeInTheDocument();
  });
});
