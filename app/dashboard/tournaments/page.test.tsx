// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import TournamentsPage from "./page";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser } from "@/providers/auth-provider";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));

vi.mock("@/app/dashboard/_components/OwnerOnlyGuard", () => ({
  OwnerOnlyGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="owner-only-guard">{children}</div>
  ),
}));

vi.mock("./_components/TournamentsManager", () => ({
  TournamentsManager: () => <div data-testid="tournaments-manager" />,
}));

vi.mock("./_components/AdminTournamentsView", () => ({
  AdminTournamentsView: () => <div data-testid="admin-tournaments-view" />,
}));

function baseUser(overrides: Partial<AppUser>): AppUser {
  return {
    id: "user_1",
    email: "user@example.com",
    displayName: "Test User",
    imageUrl: null,
    firstName: "Test",
    lastName: "User",
    role: "owner",
    clubId: "club_1",
    padelCategory: null,
    preferredSide: null,
    dominantHand: null,
    isAdmin: false,
    createdAt: null,
    ...overrides,
  };
}

function mockAuth(overrides: Partial<AppUser>, profileLoading = false) {
  vi.mocked(useAuth).mockReturnValue({
    user: baseUser(overrides),
    loading: false,
    profileLoading,
    signOut: vi.fn(),
    refetchProfile: vi.fn(),
  });
}

describe("TournamentsPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing while the profile is still loading", () => {
    mockAuth({ isAdmin: false }, true);

    const { container } = render(<TournamentsPage />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders AdminTournamentsView for an admin, bypassing OwnerOnlyGuard entirely", () => {
    mockAuth({ role: "player", isAdmin: true });

    render(<TournamentsPage />);

    expect(screen.getByTestId("admin-tournaments-view")).toBeInTheDocument();
    expect(screen.queryByTestId("owner-only-guard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tournaments-manager")).not.toBeInTheDocument();
  });

  it("falls through to the existing OwnerOnlyGuard + TournamentsManager for a non-admin owner, unchanged", () => {
    mockAuth({ role: "owner", isAdmin: false });

    render(<TournamentsPage />);

    expect(screen.getByTestId("owner-only-guard")).toBeInTheDocument();
    expect(screen.getByTestId("tournaments-manager")).toBeInTheDocument();
    expect(
      screen.queryByTestId("admin-tournaments-view"),
    ).not.toBeInTheDocument();
  });

  it("falls through to OwnerOnlyGuard for a non-admin, non-owner player (guard itself blocks rendering)", () => {
    mockAuth({ role: "player", isAdmin: false });

    render(<TournamentsPage />);

    expect(screen.getByTestId("owner-only-guard")).toBeInTheDocument();
    expect(
      screen.queryByTestId("admin-tournaments-view"),
    ).not.toBeInTheDocument();
  });
});
