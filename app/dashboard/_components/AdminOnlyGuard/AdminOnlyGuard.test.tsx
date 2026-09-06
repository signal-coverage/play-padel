// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AdminOnlyGuard } from "./AdminOnlyGuard";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser } from "@/providers/auth-provider";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

function baseUser(overrides: Partial<AppUser>): AppUser {
  return {
    id: "user_1",
    email: "user@example.com",
    displayName: "Test User",
    imageUrl: null,
    firstName: "Test",
    lastName: "User",
    role: "player",
    clubId: null,
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

describe("AdminOnlyGuard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing while the profile is still loading", () => {
    mockAuth({ isAdmin: false }, true);

    const { container } = render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("blocks a non-admin owner from rendering the children", () => {
    mockAuth({ role: "owner", isAdmin: false });

    render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    expect(screen.queryByText("Admin page content")).not.toBeInTheDocument();
    expect(
      screen.getByText("This page is only available to administrators."),
    ).toBeInTheDocument();
  });

  it("blocks a non-admin player from rendering the children", () => {
    mockAuth({ role: "player", isAdmin: false });

    render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    expect(screen.queryByText("Admin page content")).not.toBeInTheDocument();
  });

  it("renders the children for an admin, regardless of their role", () => {
    mockAuth({ role: "player", isAdmin: true });

    render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    expect(screen.getByText("Admin page content")).toBeInTheDocument();
  });
});
