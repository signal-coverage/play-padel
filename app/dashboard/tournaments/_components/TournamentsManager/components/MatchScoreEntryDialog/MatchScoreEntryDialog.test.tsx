// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MatchScoreEntryDialog } from "./MatchScoreEntryDialog";

afterEach(cleanup);

describe("MatchScoreEntryDialog", () => {
  it("submits a 2-0 sweep with set 3 left blank", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <MatchScoreEntryDialog
        open
        onOpenChange={vi.fn()}
        matchLabel="Team A vs Team B"
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    const teamAInputs = screen.getAllByLabelText("Team A games");
    const teamBInputs = screen.getAllByLabelText("Team B games");
    fireEvent.change(teamAInputs[0], { target: { value: "6" } });
    fireEvent.change(teamBInputs[0], { target: { value: "4" } });
    fireEvent.change(teamAInputs[1], { target: { value: "6" } });
    fireEvent.change(teamBInputs[1], { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /save score/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith([
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 6, teamBGames: 2 },
      ]),
    );
  });

  it("shows a validation error and does not submit when a 1-1 split leaves set 3 blank", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <MatchScoreEntryDialog
        open
        onOpenChange={vi.fn()}
        matchLabel="Team A vs Team B"
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    const teamAInputs = screen.getAllByLabelText("Team A games");
    const teamBInputs = screen.getAllByLabelText("Team B games");
    fireEvent.change(teamAInputs[0], { target: { value: "6" } });
    fireEvent.change(teamBInputs[0], { target: { value: "4" } });
    fireEvent.change(teamAInputs[1], { target: { value: "3" } });
    fireEvent.change(teamBInputs[1], { target: { value: "6" } });

    fireEvent.click(screen.getByRole("button", { name: /save score/i }));

    await waitFor(() =>
      expect(screen.getByText(/set 3 is required/i)).toBeInTheDocument(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits set 3 when a 1-1 split is decided", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <MatchScoreEntryDialog
        open
        onOpenChange={vi.fn()}
        matchLabel="Team A vs Team B"
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    const teamAInputs = screen.getAllByLabelText("Team A games");
    const teamBInputs = screen.getAllByLabelText("Team B games");
    fireEvent.change(teamAInputs[0], { target: { value: "6" } });
    fireEvent.change(teamBInputs[0], { target: { value: "4" } });
    fireEvent.change(teamAInputs[1], { target: { value: "3" } });
    fireEvent.change(teamBInputs[1], { target: { value: "6" } });
    fireEvent.change(teamAInputs[2], { target: { value: "7" } });
    fireEvent.change(teamBInputs[2], { target: { value: "5" } });

    fireEvent.click(screen.getByRole("button", { name: /save score/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith([
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 3, teamBGames: 6 },
        { setNumber: 3, teamAGames: 7, teamBGames: 5 },
      ]),
    );
  });
});
