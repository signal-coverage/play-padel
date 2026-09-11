// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const useTournamentDetailMock = vi.fn();
vi.mock("./hooks", () => ({
  useTournamentDetail: (...args: unknown[]) => useTournamentDetailMock(...args),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "me" } }),
}));

vi.mock("./components/CategoryTabs", () => ({
  CategoryTabs: ({
    categories,
    onSelect,
  }: {
    categories: { id: string; name: string }[];
    onSelect: (id: string) => void;
  }) => (
    <div>
      {categories.map((category) => (
        <button key={category.id} onClick={() => onSelect(category.id)}>
          tab:{category.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("./components/RegistrationPanel", () => ({
  RegistrationPanel: ({ categoryId }: { categoryId: string }) => (
    <div>RegistrationPanel:{categoryId}</div>
  ),
}));

vi.mock("@/app/dashboard/tournaments/_components/GroupsStandingsView", () => ({
  GroupsStandingsView: ({ categoryId }: { categoryId: string }) => (
    <div>GroupsStandingsView:{categoryId}</div>
  ),
}));

import { TournamentModal } from "./TournamentModal";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TournamentModal", () => {
  it("renders nothing (dialog closed) when tournamentId is null", () => {
    useTournamentDetailMock.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    render(<TournamentModal tournamentId={null} onOpenChange={vi.fn()} />);

    expect(screen.queryByText(/registrationpanel/i)).not.toBeInTheDocument();
  });

  it("shows a loading state while the detail is fetching", () => {
    useTournamentDetailMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(<TournamentModal tournamentId="t1" onOpenChange={vi.fn()} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("does not render CategoryTabs for a single-category tournament", () => {
    useTournamentDetailMock.mockReturnValue({
      isLoading: false,
      data: {
        id: "t1",
        name: "Spring Open",
        clubName: "Club Norte",
        categories: [
          { id: "cat_1", name: "Open", status: "REGISTRATION_OPEN" },
        ],
      },
    });

    render(<TournamentModal tournamentId="t1" onOpenChange={vi.fn()} />);

    expect(screen.queryByText(/tab:/i)).not.toBeInTheDocument();
    expect(screen.getByText("RegistrationPanel:cat_1")).toBeInTheDocument();
  });

  it("renders CategoryTabs for a 2+ category tournament and switches content on select", () => {
    useTournamentDetailMock.mockReturnValue({
      isLoading: false,
      data: {
        id: "t1",
        name: "Spring Open",
        clubName: "Club Norte",
        categories: [
          { id: "cat_1", name: "Cat A", status: "REGISTRATION_OPEN" },
          { id: "cat_2", name: "Cat B", status: "REGISTRATION_OPEN" },
        ],
      },
    });

    render(<TournamentModal tournamentId="t1" onOpenChange={vi.fn()} />);

    expect(screen.getByText("RegistrationPanel:cat_1")).toBeInTheDocument();

    fireEvent.click(screen.getByText("tab:Cat B"));

    expect(screen.getByText("RegistrationPanel:cat_2")).toBeInTheDocument();
  });

  it("shows the read-only GroupsStandingsView once a category is past REGISTRATION_OPEN", () => {
    useTournamentDetailMock.mockReturnValue({
      isLoading: false,
      data: {
        id: "t1",
        name: "Spring Open",
        clubName: "Club Norte",
        categories: [
          { id: "cat_1", name: "Open", status: "REGISTRATION_CLOSED" },
        ],
      },
    });

    render(<TournamentModal tournamentId="t1" onOpenChange={vi.fn()} />);

    expect(screen.getByText("GroupsStandingsView:cat_1")).toBeInTheDocument();
    expect(screen.queryByText(/registrationpanel/i)).not.toBeInTheDocument();
  });
});
