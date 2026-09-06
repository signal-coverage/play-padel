// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
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
          totalCourts: 42,
          totalPlayers: 120,
          totalReservations: 730,
        },
      }),
    });

    renderWithClient(fetchMock);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("730")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/metrics");
    expect(screen.getByText("Total Clubs")).toBeInTheDocument();
    expect(screen.getByText("Total Courts")).toBeInTheDocument();
    expect(screen.getByText("Total Players")).toBeInTheDocument();
    expect(screen.getByText("Reservations Booked")).toBeInTheDocument();
  });

  it("renders an Export CSV link near the reservations metric pointing at the reservations export route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: {
          totalClubs: 5,
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
});
