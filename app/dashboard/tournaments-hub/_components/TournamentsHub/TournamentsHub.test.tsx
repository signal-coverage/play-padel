// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const useOpenTournamentsMock = vi.fn();
vi.mock("./hooks", () => ({
  useOpenTournaments: () => useOpenTournamentsMock(),
}));

vi.mock("./components/TournamentModal", () => ({
  TournamentModal: ({ tournamentId }: { tournamentId: string | null }) => (
    <div>TournamentModal:{tournamentId ?? "closed"}</div>
  ),
}));

import { TournamentsHub } from "./TournamentsHub";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const TOURNAMENTS = [
  { id: "t1", name: "Spring Open", clubName: "Club Norte" },
  { id: "t2", name: "Summer Cup", clubName: "Club Sur" },
];

describe("TournamentsHub", () => {
  it("shows a loading state", () => {
    useOpenTournamentsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<TournamentsHub />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows an empty state when nothing is open", () => {
    useOpenTournamentsMock.mockReturnValue({ data: [], isLoading: false });

    render(<TournamentsHub />);

    expect(screen.getByText(/no tournaments/i)).toBeInTheDocument();
  });

  it("renders one row per tournament with the name as title and club as subtitle", () => {
    useOpenTournamentsMock.mockReturnValue({
      data: TOURNAMENTS,
      isLoading: false,
    });

    render(<TournamentsHub />);

    expect(screen.getByText("Spring Open")).toBeInTheDocument();
    expect(screen.getByText("Club Norte")).toBeInTheDocument();
    expect(screen.getByText("Summer Cup")).toBeInTheDocument();
    expect(screen.getByText("Club Sur")).toBeInTheDocument();
  });

  it("opens the modal for the clicked tournament", () => {
    useOpenTournamentsMock.mockReturnValue({
      data: TOURNAMENTS,
      isLoading: false,
    });

    render(<TournamentsHub />);

    expect(screen.getByText("TournamentModal:closed")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Spring Open"));

    expect(screen.getByText("TournamentModal:t1")).toBeInTheDocument();
  });
});
