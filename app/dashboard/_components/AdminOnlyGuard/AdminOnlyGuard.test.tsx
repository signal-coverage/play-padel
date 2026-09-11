// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AdminOnlyGuard } from "./AdminOnlyGuard";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser } from "@/providers/auth-provider";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const { toastMock } = vi.hoisted(() => ({
  toastMock: { error: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: toastMock }));

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

function mockAuth(
  overrides: Partial<AppUser>,
  options: {
    profileLoading?: boolean;
    refetchProfile?: () => Promise<void>;
  } = {},
) {
  const refetchProfile =
    options.refetchProfile ?? vi.fn().mockResolvedValue(undefined);
  vi.mocked(useAuth).mockReturnValue({
    user: baseUser(overrides),
    loading: false,
    profileLoading: options.profileLoading ?? false,
    signOut: vi.fn(),
    refetchProfile,
  });
  return refetchProfile;
}

describe("AdminOnlyGuard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    replaceMock.mockReset();
    toastMock.error.mockReset();
  });

  it("renders nothing while the profile is still loading", () => {
    mockAuth({ isAdmin: false }, { profileLoading: true });

    const { container } = render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("re-checks against a fresh profile fetch on mount before showing anything", async () => {
    const refetchProfile = mockAuth({ role: "player", isAdmin: true });

    render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    expect(refetchProfile).toHaveBeenCalled();
    expect(await screen.findByText("Admin page content")).toBeInTheDocument();
  });

  it("blocks a non-admin owner from rendering the children, once the fresh re-check resolves", async () => {
    mockAuth({ role: "owner", isAdmin: false });

    render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText("Admin page content")).not.toBeInTheDocument();
  });

  it("blocks a non-admin player from rendering the children", async () => {
    mockAuth({ role: "player", isAdmin: false });

    render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText("Admin page content")).not.toBeInTheDocument();
  });

  it("renders the children for an admin, regardless of their role", async () => {
    mockAuth({ role: "player", isAdmin: true });

    render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    expect(await screen.findByText("Admin page content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /dashboard with an explanatory toast when a non-admin actually tries to reach an admin page", async () => {
    mockAuth({ role: "player", isAdmin: false });

    render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(toastMock.error).toHaveBeenCalledWith(
      "You no longer have admin access.",
    );
  });

  // The actual scenario the user reported: the navbar still shows the Admin
  // tab (a stale AuthProvider cache still says isAdmin: true — the whole
  // reason this guard exists rather than trusting AppNavbar's own nav-link
  // filtering alone), but the SERVER has already revoked it. The fresh
  // refetchProfile() this guard fires on mount is what actually catches
  // this — a real AuthProvider updates its own `user` from that call's
  // result, which this test simulates by having the mocked refetchProfile
  // flip what useAuth() returns afterwards.
  it("redirects even when the CACHED profile still says isAdmin: true, once the fresh re-check reveals it was actually revoked", async () => {
    let isAdminNow = true;
    const refetchProfile = vi.fn().mockImplementation(async () => {
      isAdminNow = false;
    });
    vi.mocked(useAuth).mockImplementation(() => ({
      user: baseUser({ isAdmin: isAdminNow }),
      loading: false,
      profileLoading: false,
      signOut: vi.fn(),
      refetchProfile,
    }));

    render(
      <AdminOnlyGuard>
        <div>Admin page content</div>
      </AdminOnlyGuard>,
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/dashboard"));
    expect(toastMock.error).toHaveBeenCalledWith(
      "You no longer have admin access.",
    );
    expect(screen.queryByText("Admin page content")).not.toBeInTheDocument();
  });
});
