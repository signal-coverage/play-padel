// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { KnockoutRoundsList } from "./KnockoutRoundsList";
import type { GroupMatch } from "../../types";

afterEach(cleanup);

const TEAM_LABELS = {
  t1: "Alice / Ana",
  t2: "Bob / Ben",
  t3: "Cara / Cleo",
  t4: "Dana / Dee",
};

describe("KnockoutRoundsList", () => {
  it("shows an empty state with no matches", () => {
    render(
      <KnockoutRoundsList
        matches={[]}
        teamLabels={TEAM_LABELS}
        onEnterScore={vi.fn()}
        onRecordWalkover={vi.fn()}
      />,
    );
    expect(screen.getByText(/no knockout bracket yet/i)).toBeInTheDocument();
  });

  it("groups matches under their round label, in play order", () => {
    const matches: GroupMatch[] = [
      {
        id: "final",
        knockoutRound: "FINAL",
        teamAId: undefined,
        teamBId: undefined,
        status: "SCHEDULED",
      },
      {
        id: "semi_1",
        knockoutRound: "SEMIFINAL",
        teamAId: "t1",
        teamBId: "t2",
        status: "SCHEDULED",
      },
    ];
    render(
      <KnockoutRoundsList
        matches={matches}
        teamLabels={TEAM_LABELS}
        onEnterScore={vi.fn()}
        onRecordWalkover={vi.fn()}
      />,
    );

    const headings = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(headings).toEqual(["Semifinal", "Final"]);
  });

  it("shows TBD for a match with no team assigned yet", () => {
    render(
      <KnockoutRoundsList
        matches={[
          {
            id: "final",
            knockoutRound: "FINAL",
            teamAId: undefined,
            teamBId: undefined,
            status: "SCHEDULED",
          },
        ]}
        teamLabels={TEAM_LABELS}
        onEnterScore={vi.fn()}
        onRecordWalkover={vi.fn()}
      />,
    );
    expect(screen.getByText("TBD vs TBD")).toBeInTheDocument();
  });

  it("shows action buttons for a ready match and calls the right callback", () => {
    const onEnterScore = vi.fn();
    const onRecordWalkover = vi.fn();
    const match: GroupMatch = {
      id: "semi_1",
      knockoutRound: "SEMIFINAL",
      teamAId: "t1",
      teamBId: "t2",
      status: "SCHEDULED",
    };
    render(
      <KnockoutRoundsList
        matches={[match]}
        teamLabels={TEAM_LABELS}
        onEnterScore={onEnterScore}
        onRecordWalkover={onRecordWalkover}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /enter score/i }));
    expect(onEnterScore).toHaveBeenCalledWith(match);

    fireEvent.click(screen.getByRole("button", { name: /walkover/i }));
    expect(onRecordWalkover).toHaveBeenCalledWith(match);
  });

  it("hides action buttons and shows the winner for a decided match", () => {
    render(
      <KnockoutRoundsList
        matches={[
          {
            id: "semi_1",
            knockoutRound: "SEMIFINAL",
            teamAId: "t1",
            teamBId: "t2",
            status: "COMPLETED",
            winnerTeamId: "t1",
          },
        ]}
        teamLabels={TEAM_LABELS}
        onEnterScore={vi.fn()}
        onRecordWalkover={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /enter score/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/winner: alice \/ ana/i)).toBeInTheDocument();
  });

  it("never shows action buttons in readOnly mode, even for a ready match", () => {
    render(
      <KnockoutRoundsList
        matches={[
          {
            id: "semi_1",
            knockoutRound: "SEMIFINAL",
            teamAId: "t1",
            teamBId: "t2",
            status: "SCHEDULED",
          },
        ]}
        teamLabels={TEAM_LABELS}
        readOnly
      />,
    );

    expect(
      screen.queryByRole("button", { name: /enter score/i }),
    ).not.toBeInTheDocument();
  });
});
