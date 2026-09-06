// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ClubSettingsPage from "./page";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser } from "@/providers/auth-provider";

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));

vi.mock("@/app/dashboard/_components/OwnerOnlyGuard", () => ({
  OwnerOnlyGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="owner-only-guard">{children}</div>
  ),
}));

vi.mock("./_components/ClubSettingsTabs", () => ({
  ClubSettingsTabs: () => <div data-testid="club-settings-tabs" />,
}));

vi.mock("./_components/AdminClubSettingsView", () => ({
  AdminClubSettingsView: () => <div data-testid="admin-club-settings-view" />,
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

describe("ClubSettingsPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing while the profile is still loading", () => {
    mockAuth({ isAdmin: false }, true);

    const { container } = render(<ClubSettingsPage />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders AdminClubSettingsView for an admin, bypassing OwnerOnlyGuard entirely", () => {
    mockAuth({ role: "player", isAdmin: true });

    render(<ClubSettingsPage />);

    expect(screen.getByTestId("admin-club-settings-view")).toBeInTheDocument();
    expect(screen.queryByTestId("owner-only-guard")).not.toBeInTheDocument();
    expect(screen.queryByTestId("club-settings-tabs")).not.toBeInTheDocument();
  });

  it("falls through to the existing OwnerOnlyGuard + ClubSettingsTabs for a non-admin owner, unchanged", () => {
    mockAuth({ role: "owner", isAdmin: false });

    render(<ClubSettingsPage />);

    expect(screen.getByTestId("owner-only-guard")).toBeInTheDocument();
    expect(screen.getByTestId("club-settings-tabs")).toBeInTheDocument();
    expect(
      screen.queryByTestId("admin-club-settings-view"),
    ).not.toBeInTheDocument();
  });

  it("falls through to OwnerOnlyGuard for a non-admin, non-owner player (guard itself blocks rendering)", () => {
    mockAuth({ role: "player", isAdmin: false });

    render(<ClubSettingsPage />);

    expect(screen.getByTestId("owner-only-guard")).toBeInTheDocument();
    expect(
      screen.queryByTestId("admin-club-settings-view"),
    ).not.toBeInTheDocument();
  });
});
