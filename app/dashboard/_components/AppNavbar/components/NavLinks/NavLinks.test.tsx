// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NavLinks } from "./NavLinks";
import type { SystemRole } from "@/providers/auth-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

function renderNavLinks(
  role: SystemRole,
  fetchMock: ReturnType<typeof vi.fn>,
  isAdmin = false,
) {
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <NavLinks role={role} isAdmin={isAdmin} />
    </QueryClientProvider>,
  );
}

describe("NavLinks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // never fires — clean up the DOM explicitly between tests instead.
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the full owner nav while the operational status is still loading", () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    renderNavLinks("owner", fetchMock);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Courts")).toBeInTheDocument();
    expect(screen.getByText("Reservations")).toBeInTheDocument();
    expect(screen.getByText("Club Settings")).toBeInTheDocument();
    // Audit Log is admin-only now — a plain (non-admin) owner never sees it.
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("shows the full owner nav when the club is operational", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: true }),
    });
    renderNavLinks("owner", fetchMock);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/clubs/mercadopago/operational-status",
      ),
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Courts")).toBeInTheDocument();
    expect(screen.getByText("Reservations")).toBeInTheDocument();
    expect(screen.getByText("Club Settings")).toBeInTheDocument();
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("hides Audit Log for a non-admin owner even when explicitly passed isAdmin={false}", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: true }),
    });
    renderNavLinks("owner", fetchMock, false);

    await waitFor(() =>
      expect(screen.getByText("Dashboard")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("shows Audit Log for an admin owner", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: true }),
    });
    renderNavLinks("owner", fetchMock, true);

    await waitFor(() =>
      expect(screen.getByText("Audit Log")).toBeInTheDocument(),
    );
  });

  it("shows Audit Log for an admin whose role is player", () => {
    const fetchMock = vi.fn();
    renderNavLinks("player", fetchMock, true);

    expect(screen.getByText("Audit Log")).toBeInTheDocument();
  });

  it("shows only Dashboard when the owner's club is confirmed non-operational", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: false }),
    });
    renderNavLinks("owner", fetchMock);

    await waitFor(() =>
      expect(screen.queryByText("Courts")).not.toBeInTheDocument(),
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Reservations")).not.toBeInTheDocument();
    expect(screen.queryByText("Club Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("never fetches operational status for a player, and shows the full player nav", async () => {
    const fetchMock = vi.fn();
    renderNavLinks("player", fetchMock);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Browse Courts")).toBeInTheDocument();
    expect(screen.getByText("My Reservations")).toBeInTheDocument();
    expect(screen.getByText("Players")).toBeInTheDocument();

    // Give any stray microtask a chance to run before asserting the negative.
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
