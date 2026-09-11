// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminDashboardHome } from "./AdminDashboardHome";

function renderWithClient(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminDashboardHome />
    </QueryClientProvider>,
  );
}

describe("AdminDashboardHome", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the four metric values from the /api/admin/metrics response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: {
          totalClubs: 5,
          activeClubs: 3,
          inactiveClubs: 1,
          pendingApprovalClubs: 1,
          totalCourts: 42,
          totalPlayers: 120,
          totalReservations: 730,
        },
      }),
    });

    renderWithClient(fetchMock);

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("730")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/metrics");
    expect(screen.getByText("Total Clubs")).toBeInTheDocument();
    expect(screen.getByText("Total Courts")).toBeInTheDocument();
    expect(screen.getByText("Total Players")).toBeInTheDocument();
    expect(screen.getByText("Reservations Booked")).toBeInTheDocument();
  });

  it("breaks the Total Clubs card down into active/inactive/pending approval before the overall total", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: {
          totalClubs: 12,
          activeClubs: 8,
          inactiveClubs: 3,
          pendingApprovalClubs: 1,
          totalCourts: 42,
          totalPlayers: 120,
          totalReservations: 730,
        },
      }),
    });

    renderWithClient(fetchMock);

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Pending approval")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();

    // Scoped to the Total Clubs card only — "8"/"3"/"1"/"12" could
    // otherwise collide with other cards' own values in a differently
    // shaped fixture.
    const totalClubsCard = screen
      .getByText("Total Clubs")
      .closest<HTMLElement>('[data-slot="card"]');
    expect(totalClubsCard).not.toBeNull();
    if (!totalClubsCard) throw new Error("Total Clubs card not found");
    expect(within(totalClubsCard).getByText("8")).toBeInTheDocument();
    expect(within(totalClubsCard).getByText("3")).toBeInTheDocument();
    expect(within(totalClubsCard).getByText("1")).toBeInTheDocument();
    expect(within(totalClubsCard).getByText("12")).toBeInTheDocument();
  });

  it("renders an Export CSV link near the reservations metric pointing at the reservations export route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: {
          totalClubs: 5,
          activeClubs: 3,
          inactiveClubs: 1,
          pendingApprovalClubs: 1,
          totalCourts: 42,
          totalPlayers: 120,
          totalReservations: 730,
        },
      }),
    });

    renderWithClient(fetchMock);

    await waitFor(() => {
      expect(screen.getByText("Reservations Booked")).toBeInTheDocument();
    });

    const exportLink = screen.getByRole("link", { name: /export csv/i });
    expect(exportLink).toHaveAttribute(
      "href",
      "/api/admin/export/reservations",
    );
  });

  it("anchors the Export CSV button to the bottom-right of its card", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: {
          totalClubs: 5,
          activeClubs: 3,
          inactiveClubs: 1,
          pendingApprovalClubs: 1,
          totalCourts: 42,
          totalPlayers: 120,
          totalReservations: 730,
        },
      }),
    });

    renderWithClient(fetchMock);

    const exportLink = await screen.findByRole("link", {
      name: /export csv/i,
    });
    // The Button itself (not just the inner <a>) carries the alignment —
    // self-end (cross-axis, within CardContent's flex-col) pushes it to the
    // right, mt-auto (main-axis) pushes it to the bottom of the card, which
    // stretches to match its taller siblings via the grid row's default
    // stretch alignment (see the grid wrapper in AdminDashboardHome.tsx).
    const button = exportLink.closest('[data-slot="button"]');
    expect(button).not.toBeNull();
    expect(button?.className).toMatch(/\bself-end\b/);
    expect(button?.className).toMatch(/\bmt-auto\b/);

    const cardContent = exportLink.closest('[data-slot="card-content"]');
    expect(cardContent).not.toBeNull();
    expect(cardContent?.className).toMatch(/\bflex\b/);
    expect(cardContent?.className).toMatch(/\bflex-1\b/);
    expect(cardContent?.className).toMatch(/\bflex-col\b/);
  });
});
