// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { GroupMatchesList } from "./GroupMatchesList";
import type { GroupMatch } from "../../types";

afterEach(cleanup);

const TEAM_LABELS = { t1: "Alice / Ana", t2: "Bob / Ben" };

describe("GroupMatchesList", () => {
  it("shows an empty state with no matches", () => {
    render(
      <GroupMatchesList
        matches={[]}
        teamLabels={TEAM_LABELS}
        onEnterScore={vi.fn()}
        onRecordWalkover={vi.fn()}
      />,
    );
    expect(screen.getByText(/no matches yet/i)).toBeInTheDocument();
  });

  it("shows action buttons for a scheduled match and calls the right callback", () => {
    const onEnterScore = vi.fn();
    const onRecordWalkover = vi.fn();
    const match: GroupMatch = {
      id: "match_1",
      teamAId: "t1",
      teamBId: "t2",
      status: "SCHEDULED",
    };
    render(
      <GroupMatchesList
        matches={[match]}
        teamLabels={TEAM_LABELS}
        onEnterScore={onEnterScore}
        onRecordWalkover={onRecordWalkover}
      />,
    );

    expect(screen.getByText("Alice / Ana vs Bob / Ben")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /enter score/i }));
    expect(onEnterScore).toHaveBeenCalledWith(match);

    fireEvent.click(screen.getByRole("button", { name: /walkover/i }));
    expect(onRecordWalkover).toHaveBeenCalledWith(match);
  });

  it("hides action buttons and shows the winner for a decided match", () => {
    render(
      <GroupMatchesList
        matches={[
          {
            id: "match_1",
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

  it("never shows action buttons in readOnly mode, even for a scheduled match", () => {
    render(
      <GroupMatchesList
        matches={[
          { id: "match_1", teamAId: "t1", teamBId: "t2", status: "SCHEDULED" },
        ]}
        teamLabels={TEAM_LABELS}
        readOnly
      />,
    );

    expect(
      screen.queryByRole("button", { name: /enter score/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /walkover/i }),
    ).not.toBeInTheDocument();
  });
});
