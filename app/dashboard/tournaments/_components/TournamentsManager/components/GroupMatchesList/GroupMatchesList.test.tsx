// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { GroupMatchesList } from "./GroupMatchesList";
import type { GroupMatch } from "../../types";

afterEach(cleanup);

const TEAM_LABELS = { t1: "Alice / Ana", t2: "Bob / Ben" };

function renderList(props: React.ComponentProps<typeof GroupMatchesList>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <GroupMatchesList {...props} />
    </NextIntlClientProvider>,
  );
}

describe("GroupMatchesList", () => {
  it("shows an empty state with no matches", () => {
    renderList({
      matches: [],
      teamLabels: TEAM_LABELS,
      onEnterScore: vi.fn(),
      onRecordWalkover: vi.fn(),
    });
    expect(screen.getByText(/todavía no hay partidos/i)).toBeInTheDocument();
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
    renderList({
      matches: [match],
      teamLabels: TEAM_LABELS,
      onEnterScore,
      onRecordWalkover,
    });

    expect(screen.getByText("Alice / Ana vs Bob / Ben")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cargar resultado/i }));
    expect(onEnterScore).toHaveBeenCalledWith(match);

    fireEvent.click(screen.getByRole("button", { name: /walkover/i }));
    expect(onRecordWalkover).toHaveBeenCalledWith(match);
  });

  it("hides action buttons and shows the winner for a decided match", () => {
    renderList({
      matches: [
        {
          id: "match_1",
          teamAId: "t1",
          teamBId: "t2",
          status: "COMPLETED",
          winnerTeamId: "t1",
        },
      ],
      teamLabels: TEAM_LABELS,
      onEnterScore: vi.fn(),
      onRecordWalkover: vi.fn(),
    });

    expect(
      screen.queryByRole("button", { name: /cargar resultado/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/ganador: alice \/ ana/i)).toBeInTheDocument();
  });

  it("never shows action buttons in readOnly mode, even for a scheduled match", () => {
    renderList({
      matches: [
        { id: "match_1", teamAId: "t1", teamBId: "t2", status: "SCHEDULED" },
      ],
      teamLabels: TEAM_LABELS,
      readOnly: true,
    });

    expect(
      screen.queryByRole("button", { name: /cargar resultado/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /walkover/i }),
    ).not.toBeInTheDocument();
  });
});
