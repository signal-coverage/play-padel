// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardHome } from "./DashboardHome";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser } from "@/providers/auth-provider";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

vi.mock("./components/SearchableCardsGrid", () => ({
  SearchableCardsGrid: () => <div>Searchable cards grid</div>,
}));

vi.mock("./components/PlayerOverview/PlayerOverviewCard", () => ({
  PlayerOverviewCard: () => <div>Player overview card</div>,
}));

vi.mock("./components/PlayerOverview/PlayerOverviewBanner", () => ({
  PlayerOverviewBanner: () => <div>Player overview banner</div>,
}));

vi.mock("@/components/UpgradeMembershipButton", () => ({
  UpgradeMembershipButton: () => <button>Upgrade</button>,
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

function mockAuth(overrides: Partial<AppUser>) {
  vi.mocked(useAuth).mockReturnValue({
    user: baseUser(overrides),
    loading: false,
    profileLoading: false,
    signOut: vi.fn(),
    refetchProfile: vi.fn(),
  });
}

function renderDashboardHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardHome />
    </QueryClientProvider>,
  );
}

describe("DashboardHome", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // The platform-wide admin metrics view moved to its own page (see
  // app/dashboard/admin-overview/page.tsx, reached from the Admin
  // dropdown's new "Overview" item) — an admin who's ALSO a player/owner
  // must keep seeing their own normal dashboard here, not have it replaced
  // wholesale just because isAdmin is true (role and isAdmin are
  // independent — see prisma/schema.prisma's UserProfile.isAdmin comment).
  it("renders the normal player view for an admin with role player, not a separate admin dashboard", () => {
    mockAuth({ role: "player", isAdmin: true });

    renderDashboardHome();

    expect(screen.getByText("Searchable cards grid")).toBeInTheDocument();
    expect(screen.getByText("Player overview card")).toBeInTheDocument();
  });

  it("renders the normal owner view for an admin with role owner, not a separate admin dashboard", () => {
    mockAuth({ role: "owner", isAdmin: true });

    renderDashboardHome();

    expect(screen.getByText("Searchable cards grid")).toBeInTheDocument();
  });

  it("renders the normal player view for a non-admin player", () => {
    mockAuth({ role: "player", isAdmin: false });

    renderDashboardHome();

    expect(screen.getByText("Searchable cards grid")).toBeInTheDocument();
  });

  it("renders the normal owner view for a non-admin owner", () => {
    mockAuth({ role: "owner", isAdmin: false });

    renderDashboardHome();

    expect(screen.getByText("Searchable cards grid")).toBeInTheDocument();
  });
});
