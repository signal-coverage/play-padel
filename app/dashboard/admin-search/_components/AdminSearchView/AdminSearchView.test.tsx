// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminSearchView } from "./AdminSearchView";
import { ADMIN_SEARCH_DEBOUNCE_MS } from "./consts";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// jsdom doesn't implement ResizeObserver, but DataTable relies on it
// internally to measure scroll fade state (see CourtsTable.test.tsx /
// AdminClubSettingsView.test.tsx using the same stub).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderView(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminSearchView />
    </QueryClientProvider>,
  );
}

function emptyResultsResponse() {
  return {
    ok: true,
    json: async () => ({ clubs: [], players: [], reservations: [] }),
  };
}

describe("AdminSearchView", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders the search input", () => {
    renderView(vi.fn());

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("shows an empty-query state before any input, without calling the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(emptyResultsResponse());
    renderView(fetchMock);

    expect(screen.getByText(/start typing to search/i)).toBeInTheDocument();

    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces the search input, firing only one request after the delay", async () => {
    const fetchMock = vi.fn().mockResolvedValue(emptyResultsResponse());
    renderView(fetchMock);

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "j" } });
    fireEvent.change(input, { target: { value: "ju" } });
    fireEvent.change(input, { target: { value: "juan" } });

    // No request fires immediately per keystroke.
    expect(fetchMock).not.toHaveBeenCalled();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1), {
      timeout: ADMIN_SEARCH_DEBOUNCE_MS + 1000,
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("q=juan"));
  });

  it("renders grouped results for clubs, players, and reservations", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clubs: [
          {
            id: "club_1",
            name: "Padel Norte",
            email: "norte@example.com",
            status: "ACTIVE",
          },
        ],
        players: [
          {
            id: "user_1",
            displayName: "Juan Perez",
            email: "juan@example.com",
          },
        ],
        reservations: [
          {
            id: "res_1",
            courtName: "Court 1",
            clubId: "club_1",
            playerName: "Juan Perez",
            scheduledStart: "2026-09-10T10:00:00.000Z",
            status: "CONFIRMED",
          },
        ],
      }),
    });
    renderView(fetchMock);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "Juan" },
    });

    await waitFor(() =>
      expect(screen.getByText("Padel Norte")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("Juan Perez").length).toBeGreaterThan(0);
    expect(screen.getByText("Court 1")).toBeInTheDocument();
  });

  it("shows a no-results message for a group with no matches", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clubs: [
          {
            id: "club_1",
            name: "Padel Norte",
            email: "norte@example.com",
            status: "ACTIVE",
          },
        ],
        players: [],
        reservations: [],
      }),
    });
    renderView(fetchMock);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "Norte" },
    });

    await waitFor(() =>
      expect(screen.getByText("Padel Norte")).toBeInTheDocument(),
    );
    expect(screen.getByText(/no players found/i)).toBeInTheDocument();
    expect(screen.getByText(/no reservations found/i)).toBeInTheDocument();
  });

  it("clicking a club result navigates to the club settings page scoped to it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clubs: [
          {
            id: "club_1",
            name: "Padel Norte",
            email: "norte@example.com",
            status: "ACTIVE",
          },
        ],
        players: [],
        reservations: [],
      }),
    });
    renderView(fetchMock);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "Norte" },
    });

    await waitFor(() =>
      expect(screen.getByText("Padel Norte")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Padel Norte"));

    expect(pushMock).toHaveBeenCalledWith(
      "/dashboard/settings/club?clubId=club_1",
    );
  });

  it("player and reservation results are not clickable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clubs: [],
        players: [
          {
            id: "user_1",
            displayName: "Juan Perez",
            email: "juan@example.com",
          },
        ],
        reservations: [
          {
            id: "res_1",
            courtName: "Court 1",
            clubId: "club_1",
            playerName: "Juan Perez",
            scheduledStart: "2026-09-10T10:00:00.000Z",
            status: "CONFIRMED",
          },
        ],
      }),
    });
    renderView(fetchMock);

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "Juan" },
    });

    await waitFor(() =>
      expect(screen.getByText("Court 1")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByText("Juan Perez")[0]);
    fireEvent.click(screen.getByText("Court 1"));

    expect(pushMock).not.toHaveBeenCalled();
  });
});
