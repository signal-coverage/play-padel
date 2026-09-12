// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { TournamentsList } from "./TournamentsList";

afterEach(cleanup);

describe("TournamentsList", () => {
  it("shows an empty state with no tournaments", () => {
    render(
      <TournamentsList
        tournaments={[]}
        selectedTournamentId={null}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText(/no tournaments yet/i)).toBeInTheDocument();
  });

  it("calls onSelect with the clicked tournament's id", () => {
    const onSelect = vi.fn();
    render(
      <TournamentsList
        tournaments={[
          { id: "t1", name: "Summer Open", status: "DRAFT" },
          { id: "t2", name: "Winter Cup", status: "REGISTRATION_OPEN" },
        ]}
        selectedTournamentId={null}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /winter cup/i }));

    expect(onSelect).toHaveBeenCalledWith("t2");
  });
});
