// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MobileBottomNav } from "./MobileBottomNav";
import type { SystemRole } from "@/providers/auth-provider";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

function renderMobileBottomNav(
  role: SystemRole,
  fetchMock: ReturnType<typeof vi.fn>,
) {
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MobileBottomNav role={role} />
    </QueryClientProvider>,
  );
}

describe("MobileBottomNav", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows only Dashboard when the owner's club is confirmed non-operational", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: false }),
    });
    renderMobileBottomNav("owner", fetchMock);

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
    renderMobileBottomNav("player", fetchMock);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Browse Courts")).toBeInTheDocument();

    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
