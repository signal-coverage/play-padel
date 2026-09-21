// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import { AdminTournamentsView } from "./AdminTournamentsView";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const CLUB_A = {
  id: "club_1",
  name: "Club Padel Norte",
  slug: "club-padel-norte",
  status: "ACTIVE",
  plan: "PRO",
  courtLimit: null,
  mpTokenIssue: false,
  membershipPastDue: false,
  noOperatingHours: false,
  isFreePlan: false,
};

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body } as Response;
}

function renderView() {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/admin/clubs") {
      return jsonResponse({ clubs: [CLUB_A] });
    }
    if (url === "/api/admin/clubs/club_1/tournaments") {
      return jsonResponse({ tournaments: [] });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <AdminTournamentsView />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );

  return fetchMock;
}

describe("AdminTournamentsView", () => {
  it("shows a placeholder before any club is selected", async () => {
    renderView();

    await waitFor(() =>
      expect(screen.getByText("Club Padel Norte")).toBeInTheDocument(),
    );

    expect(
      screen.getByText(/seleccioná un club para gestionar sus torneos/i),
    ).toBeInTheDocument();
  });

  it("renders the full TournamentsManager scoped to the selected club once one is picked", async () => {
    const fetchMock = renderView();

    await waitFor(() =>
      expect(screen.getByText("Club Padel Norte")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Club Padel Norte"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/clubs/club_1/tournaments",
        undefined,
      ),
    );
    expect(
      screen.queryByText(/seleccioná un club para gestionar sus torneos/i),
    ).not.toBeInTheDocument();
  });
});
