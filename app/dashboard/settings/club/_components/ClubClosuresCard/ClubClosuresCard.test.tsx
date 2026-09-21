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
import { ClubClosuresCard } from "./ClubClosuresCard";

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

type FetchHandlers = {
  courts?: { id: string }[];
  closures?: unknown[];
  onCreate?: (
    courtId: string,
    body: unknown,
  ) => { ok: boolean; error?: string };
};

function renderCard({
  courts = [{ id: "court_1" }, { id: "court_2" }],
  closures = [],
  onCreate,
}: FetchHandlers = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/clubs/courts" && (!init || !init.method)) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ courts }),
      });
    }
    if (url === "/api/clubs/closures" && (!init || !init.method)) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ closures }),
      });
    }
    const createMatch = url.match(/^\/api\/clubs\/courts\/([^/]+)\/closures$/);
    if (createMatch && init?.method === "POST") {
      const courtId = createMatch[1];
      const body = JSON.parse(init.body as string);
      const result = onCreate?.(courtId, body) ?? { ok: true };
      if (!result.ok) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: result.error ?? "Failed" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          closure: { id: `closure_${courtId}`, courtId, ...body },
        }),
      });
    }
    const cancelMatch = url.match(
      /^\/api\/clubs\/courts\/([^/]+)\/closures\/([^/]+)\/cancel$/,
    );
    if (cancelMatch && init?.method === "POST") {
      const [, courtId, closureId] = cancelMatch;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          closure: {
            id: closureId,
            courtId,
            courtName: "Court 1",
            startsAt: new Date().toISOString(),
            endsAt: new Date().toISOString(),
            reason: "Club rented for a tournament",
            createdAt: new Date().toISOString(),
            cancelledAt: new Date().toISOString(),
          },
        }),
      });
    }
    throw new Error(`unexpected fetch: ${url} ${init?.method ?? "GET"}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const utils = render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <ClubClosuresCard />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );

  return { ...utils, fetchMock, queryClient };
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(/comienza/i), {
    target: { value: "2026-10-01T10:00" },
  });
  fireEvent.change(screen.getByLabelText(/termina/i), {
    target: { value: "2099-10-01T18:00" },
  });
  fireEvent.change(screen.getByLabelText(/motivo/i), {
    target: { value: "Club rented for a tournament" },
  });
  fireEvent.click(screen.getByRole("button", { name: /cerrar el club/i }));
}

describe("ClubClosuresCard", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("renders the tab heading", async () => {
    renderCard();

    expect(
      screen.getByRole("heading", { name: /cierres/i }),
    ).toBeInTheDocument();
  });

  it("lists existing club-wide closures fetched from the club-scoped endpoint", async () => {
    renderCard({
      closures: [
        {
          id: "closure_1",
          courtId: "court_1",
          courtName: "Court 1",
          startsAt: new Date(Date.now() + 60_000).toISOString(),
          endsAt: new Date(Date.now() + 120_000).toISOString(),
          reason: "Club rented for a tournament",
          createdAt: new Date().toISOString(),
          createdBy: "user_1",
        },
      ],
    });

    await waitFor(() =>
      expect(
        screen.getByText("Club rented for a tournament"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/Court 1/)).toBeInTheDocument();
  });

  it("shows the empty state when the club has no closures yet", async () => {
    renderCard({ closures: [] });

    await waitFor(() =>
      expect(screen.getByText(/todavía no hay cierres/i)).toBeInTheDocument(),
    );
  });

  it("fans the created closure out to every active court and shows one success toast", async () => {
    const { fetchMock } = renderCard({
      courts: [{ id: "court_1" }, { id: "court_2" }],
    });

    // Waiting for the closures list to finish loading (not just for the form
    // to render) also gives the sibling active-courts query time to resolve
    // and land in state — handleCreate reads activeCourtIds from that query,
    // so submitting before it resolves would spuriously look like "no active
    // courts".
    await waitFor(() =>
      expect(screen.getByText(/todavía no hay cierres/i)).toBeInTheDocument(),
    );
    fillAndSubmit();

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Cierre creado para 2 canchas"),
    );

    const createCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        typeof url === "string" &&
        /\/api\/clubs\/courts\/[^/]+\/closures$/.test(url) &&
        init?.method === "POST",
    );
    expect(createCalls).toHaveLength(2);
    const targetedCourtIds = createCalls
      .map(([url]) => (url as string).match(/courts\/([^/]+)\/closures/)?.[1])
      .sort();
    expect(targetedCourtIds).toEqual(["court_1", "court_2"]);
  });

  it("shows one aggregate error toast when every court conflicts", async () => {
    renderCard({
      courts: [{ id: "court_1" }, { id: "court_2" }],
      onCreate: () => ({
        ok: false,
        error: "This closure overlaps a reservation",
      }),
    });

    await waitFor(() =>
      expect(screen.getByText(/todavía no hay cierres/i)).toBeInTheDocument(),
    );
    fillAndSubmit();

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "This closure overlaps a reservation",
      ),
    );
  });

  it("refuses to submit and shows an error when the club has no active courts", async () => {
    const { fetchMock } = renderCard({ courts: [] });

    await waitFor(() =>
      expect(screen.getByLabelText(/comienza/i)).toBeInTheDocument(),
    );
    fillAndSubmit();

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    const createCalls = fetchMock.mock.calls.filter(
      ([url]) =>
        typeof url === "string" && /courts\/[^/]+\/closures$/.test(url),
    );
    expect(createCalls).toHaveLength(0);
  });

  it("cancels a closure through the confirm dialog and shows a success toast", async () => {
    const { fetchMock } = renderCard({
      closures: [
        {
          id: "closure_1",
          courtId: "court_1",
          courtName: "Court 1",
          startsAt: new Date(Date.now() - 60_000).toISOString(),
          endsAt: new Date(Date.now() + 60_000).toISOString(),
          reason: "Club rented for a tournament",
          createdAt: new Date().toISOString(),
          createdBy: "user_1",
        },
      ],
    });

    await waitFor(() =>
      expect(
        screen.getByText("Club rented for a tournament"),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /^cancelar$/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar cierre/i }));

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Cierre cancelado"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/clubs/courts/court_1/closures/closure_1/cancel",
      { method: "POST" },
    );
  });
});
