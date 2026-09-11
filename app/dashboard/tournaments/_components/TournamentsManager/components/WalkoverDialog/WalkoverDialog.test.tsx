// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { WalkoverDialog } from "./WalkoverDialog";

afterEach(cleanup);

describe("WalkoverDialog", () => {
  it("calls onConfirm with team A's id when Team A wins is clicked", () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <WalkoverDialog
        open
        onOpenChange={vi.fn()}
        teamAId="team_a"
        teamALabel="Alice / Ana"
        teamBId="team_b"
        teamBLabel="Bob / Ben"
        onConfirm={onConfirm}
        isSubmitting={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /alice \/ ana wins/i }));

    expect(onConfirm).toHaveBeenCalledWith("team_a");
  });

  it("calls onConfirm with team B's id when Team B wins is clicked", () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <WalkoverDialog
        open
        onOpenChange={vi.fn()}
        teamAId="team_a"
        teamALabel="Alice / Ana"
        teamBId="team_b"
        teamBLabel="Bob / Ben"
        onConfirm={onConfirm}
        isSubmitting={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /bob \/ ben wins/i }));

    expect(onConfirm).toHaveBeenCalledWith("team_b");
  });
});
