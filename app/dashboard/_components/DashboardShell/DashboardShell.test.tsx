// @vitest-environment jsdom
//
// Regression coverage for the design-flagged risk: wiring ClubOperationalGate
// into DashboardShell (Phase 8, task 8.6) must not interfere with
// DashboardGuard's existing onboarding-redirect logic. Specifically:
//   - A club/user that never finished onboarding (no role, or an owner with
//     no clubId yet) must still be redirected to /onboarding — the new gate
//     must never render (and must never swallow) that redirect.
//   - A fully onboarded owner whose club is non-operational (MP not
//     connected, or Club.status !== ACTIVE) must NOT be redirected to
//     onboarding — they must see the ClubOperationalGate's gate screen in
//     place of the dashboard content (which is not mounted at all).
//   - Players are never gated — no operational-status fetch is made for them
//     and their dashboard renders unaffected.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DashboardShell } from "./DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import type { AppUser } from "@/providers/auth-provider";

const replaceMock = vi.fn();

// Mutable so individual tests can control what the mocked
// useSearchParams()/usePathname() return (mirroring the `vi.mocked(useAuth)
// .mockReturnValue(...)` per-test control technique used below for
// useAuth) — the 5 pre-existing tests never touch these and get the
// no-op defaults, so the new mpConnect-consuming effect is a no-op for all
// of them.
let mockSearchParams = new URLSearchParams();
let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

// AppNavbar/MobileBottomNav/DashboardLoader pull in a lot of unrelated
// navigation/auth chrome that isn't relevant to this regression check —
// stub them so the test stays focused on the Guard+Gate interaction.
vi.mock("@/app/dashboard/_components/AppNavbar", () => ({
  AppNavbar: () => <nav>navbar</nav>,
  MobileBottomNav: () => <nav>mobile-nav</nav>,
}));

vi.mock("@/app/dashboard/_components/DashboardLoader", () => ({
  DashboardLoader: () => <div>loading</div>,
}));

function baseUser(overrides: Partial<AppUser>): AppUser {
  return {
    id: "user_1",
    email: "owner@example.com",
    displayName: "Owner",
    imageUrl: null,
    firstName: "Owner",
    lastName: null,
    role: null,
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

describe("DashboardShell — ClubOperationalGate regression vs. DashboardGuard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    replaceMock.mockClear();
    mockSearchParams = new URLSearchParams();
    mockPathname = "/dashboard";
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("still redirects to /onboarding for a user with no role at all (never onboarded)", async () => {
    mockAuth({ role: null, clubId: null });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardShell>
        <div>Dashboard page content</div>
      </DashboardShell>,
    );

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/onboarding"),
    );

    expect(
      screen.queryByText("Dashboard page content"),
    ).not.toBeInTheDocument();
    // The gate must never mount (and therefore never fetch) before the
    // onboarding redirect has had a chance to fire.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still redirects to /onboarding for an owner with no club yet (registration incomplete)", async () => {
    mockAuth({ role: "owner", clubId: null });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardShell>
        <div>Dashboard page content</div>
      </DashboardShell>,
    );

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/onboarding"),
    );

    expect(
      screen.queryByText("Dashboard page content"),
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does NOT redirect a fully onboarded, MP-disconnected owner — shows the gate screen instead of mounting the page", async () => {
    mockAuth({ role: "owner", clubId: "club_1" });
    // PaymentActivationScreen (rendered by the gate for this cause) also
    // fetches/mutates /api/clubs — branch the mock by URL/method so each
    // endpoint gets the shape its caller actually expects.
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes("/mercadopago/operational-status")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            operational: false,
            cause: "MP_NOT_CONNECTED",
          }),
        });
      }
      // PaymentActivationScreen (rendered by the gate for this cause) calls
      // useMembershipSubscription itself once mounted — its actual value is
      // otherwise irrelevant to what this test asserts.
      if (url === "/api/clubs/membership") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ subscription: null }),
        });
      }
      if (url === "/api/clubs" && (!init || init.method === undefined)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            club: {
              id: "club_1",
              name: "Test Club",
              email: "club@example.com",
              timezone: "America/Argentina/Buenos_Aires",
              currency: "ARS",
              plan: "BASIC",
              status: "ACTIVE",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: "user_1",
              updatedBy: "user_1",
            },
          }),
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardShell>
        <div>Dashboard page content</div>
      </DashboardShell>,
    );

    await screen.findByRole("heading", { name: "Payment activation" });

    expect(replaceMock).not.toHaveBeenCalledWith("/onboarding");
    // The page is not mounted at all (that's the point of the gate) — it's
    // neither swallowed by DashboardGuard's redirect nor rendered blurred
    // underneath the gate screen.
    expect(
      screen.queryByText("Dashboard page content"),
    ).not.toBeInTheDocument();
  });

  it("does NOT redirect a fully onboarded, active+connected owner — renders dashboard content unblurred", async () => {
    mockAuth({ role: "owner", clubId: "club_1" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: true, cause: null }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardShell>
        <div>Dashboard page content</div>
      </DashboardShell>,
    );

    await waitFor(() =>
      expect(screen.getByText("Dashboard page content")).toBeInTheDocument(),
    );

    expect(replaceMock).not.toHaveBeenCalledWith("/onboarding");
    expect(screen.queryByText("Payment activation")).not.toBeInTheDocument();
    expect(screen.queryByText("Renew your membership")).not.toBeInTheDocument();
  });

  it("never gates players — no operational-status fetch, dashboard renders as-is", async () => {
    mockAuth({ role: "player", clubId: null });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardShell>
        <div>Dashboard page content</div>
      </DashboardShell>,
    );

    await waitFor(() =>
      expect(screen.getByText("Dashboard page content")).toBeInTheDocument(),
    );

    expect(replaceMock).not.toHaveBeenCalledWith("/onboarding");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens MercadoPagoConnectedDialog and strips ?mpConnect=success from the URL for an owner landing from the OAuth redirect", async () => {
    mockAuth({ role: "owner", clubId: "club_1" });
    mockSearchParams = new URLSearchParams("mpConnect=success");
    mockPathname = "/dashboard/courts";
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/mercadopago/operational-status")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ operational: true, cause: null }),
        });
      }
      // Defensive only: nothing actually calls this while the club is
      // already operational (PaymentActivationScreen, the only consumer of
      // this endpoint, never mounts in that case).
      if (url === "/api/clubs/membership") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ subscription: null }),
        });
      }
      if (url === "/api/clubs/bank-transfer-account") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ account: null }),
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardShell>
        <div>Dashboard page content</div>
      </DashboardShell>,
    );

    await waitFor(() =>
      expect(screen.getByText("Dashboard page content")).toBeInTheDocument(),
    );

    await waitFor(() =>
      expect(screen.getByText("Mercado Pago connected!")).toBeInTheDocument(),
    );

    expect(replaceMock).toHaveBeenCalledWith("/dashboard/courts");
  });

  it("never opens MercadoPagoConnectedDialog for a player, even with ?mpConnect=success in the URL", async () => {
    mockAuth({ role: "player", clubId: null });
    mockSearchParams = new URLSearchParams("mpConnect=success");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DashboardShell>
        <div>Dashboard page content</div>
      </DashboardShell>,
    );

    await waitFor(() =>
      expect(screen.getByText("Dashboard page content")).toBeInTheDocument(),
    );

    expect(
      screen.queryByText("Mercado Pago connected!"),
    ).not.toBeInTheDocument();
  });
});
