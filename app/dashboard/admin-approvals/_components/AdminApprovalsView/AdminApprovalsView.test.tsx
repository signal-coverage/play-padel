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
import { AdminApprovalsView } from "./AdminApprovalsView";

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: toastMock,
}));

// jsdom doesn't implement ResizeObserver, but DataTable relies on it
// internally to measure scroll fade state (see AdminSearchView.test.tsx /
// CourtsTable.test.tsx using the same stub).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const PENDING_CLUB = {
  id: "club_1",
  name: "New Padel Club",
  email: "owner@newclub.com",
  createdAt: "2026-09-01T00:00:00.000Z",
  possibleDuplicate: false,
};

const SECOND_PENDING_CLUB = {
  id: "club_2",
  name: "Second Padel Club",
  email: "owner2@newclub.com",
  createdAt: "2026-09-01T00:00:00.000Z",
  possibleDuplicate: false,
};

function renderView(fetchImpl: (url: string, init?: RequestInit) => unknown) {
  const fetchMock = vi.fn(fetchImpl);
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <AdminApprovalsView />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );

  return fetchMock;
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body });
}

describe("AdminApprovalsView", () => {
  afterEach(() => {
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // never fires — clean up the DOM explicitly between tests instead.
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows an empty state when no clubs are pending", async () => {
    renderView((url) => {
      if (url === "/api/admin/clubs/pending")
        return jsonResponse({ clubs: [] });
      throw new Error(`unexpected fetch: ${url}`);
    });

    expect(
      await screen.findByText("No hay clubes esperando aprobación."),
    ).toBeInTheDocument();
  });

  it("lists a pending club with Approve and Reject actions", async () => {
    renderView((url) => {
      if (url === "/api/admin/clubs/pending")
        return jsonResponse({ clubs: [PENDING_CLUB] });
      throw new Error(`unexpected fetch: ${url}`);
    });

    expect(await screen.findByText("New Padel Club")).toBeInTheDocument();
    expect(screen.getByText("owner@newclub.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Rechazar" }),
    ).toBeInTheDocument();
  });

  const DUPLICATE_WARNING_TITLE =
    "Otro club ya tiene este email o dirección — revisá antes de aprobar.";

  it("shows a duplicate-warning badge when possibleDuplicate is true", async () => {
    renderView((url) => {
      if (url === "/api/admin/clubs/pending") {
        return jsonResponse({
          clubs: [{ ...PENDING_CLUB, possibleDuplicate: true }],
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByText("New Padel Club");
    expect(screen.getByTitle(DUPLICATE_WARNING_TITLE)).toBeInTheDocument();
  });

  it("shows no duplicate-warning badge when possibleDuplicate is false", async () => {
    renderView((url) => {
      if (url === "/api/admin/clubs/pending")
        return jsonResponse({ clubs: [PENDING_CLUB] });
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByText("New Padel Club");
    expect(
      screen.queryByTitle(DUPLICATE_WARNING_TITLE),
    ).not.toBeInTheDocument();
  });

  it("approves a club directly (no confirm step) and removes it from the list on success", async () => {
    let approved = false;
    const fetchMock = renderView((url, init) => {
      if (url === "/api/admin/clubs/pending") {
        return jsonResponse({ clubs: approved ? [] : [PENDING_CLUB] });
      }
      if (
        url === "/api/admin/clubs/club_1/approve" &&
        init?.method === "POST"
      ) {
        approved = true;
        return jsonResponse({ ok: true });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByText("New Padel Club");

    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/clubs/club_1/approve",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    await waitFor(() =>
      expect(
        screen.getByText("No hay clubes esperando aprobación."),
      ).toBeInTheDocument(),
    );
    expect(toastMock.success).toHaveBeenCalledWith("Club aprobado");
  });

  it("requires confirmation before rejecting, and removes the club from the list once confirmed", async () => {
    let rejected = false;
    const fetchMock = renderView((url, init) => {
      if (url === "/api/admin/clubs/pending") {
        return jsonResponse({ clubs: rejected ? [] : [PENDING_CLUB] });
      }
      if (url === "/api/admin/clubs/club_1/reject" && init?.method === "POST") {
        rejected = true;
        return jsonResponse({ ok: true });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByText("New Padel Club");

    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    // The confirm dialog blocks the actual mutation until explicitly
    // confirmed — clicking "Rechazar" alone must not have called the API yet.
    const confirmHeading = await screen.findByText("¿Rechazar este club?");
    expect(confirmHeading).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/admin/clubs/club_1/reject",
      expect.anything(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Rechazar club" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/clubs/club_1/reject",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    await waitFor(() =>
      expect(
        screen.getByText("No hay clubes esperando aprobación."),
      ).toBeInTheDocument(),
    );
    expect(toastMock.success).toHaveBeenCalledWith("Club rechazado");
  });

  it("removes the approved club from the list even when the follow-up background refetch fails", async () => {
    // The mutation's invalidateQueries triggers a second GET in the
    // background purely to reconcile with the server — that second request
    // can fail for any of the usual transient reasons (network blip, a
    // dropped connection) independent of the approve POST, which already
    // succeeded. The row must still disappear immediately regardless,
    // because the success handler patches the cache directly rather than
    // depending on that second request's own outcome.
    let pendingListCallCount = 0;
    renderView((url, init) => {
      if (url === "/api/admin/clubs/pending") {
        pendingListCallCount += 1;
        if (pendingListCallCount === 1) {
          return jsonResponse({ clubs: [PENDING_CLUB] });
        }
        return jsonResponse({ error: "Network error" }, false);
      }
      if (
        url === "/api/admin/clubs/club_1/approve" &&
        init?.method === "POST"
      ) {
        return jsonResponse({ ok: true });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByText("New Padel Club");
    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    await waitFor(() =>
      expect(
        screen.getByText("No hay clubes esperando aprobación."),
      ).toBeInTheDocument(),
    );
  });

  it('shows "Aprobando…" only on the clicked row while the request is in flight', async () => {
    let resolveApprove: (() => void) | undefined;
    renderView((url, init) => {
      if (url === "/api/admin/clubs/pending") {
        return jsonResponse({ clubs: [PENDING_CLUB, SECOND_PENDING_CLUB] });
      }
      if (
        url === "/api/admin/clubs/club_1/approve" &&
        init?.method === "POST"
      ) {
        return new Promise((resolve) => {
          resolveApprove = () =>
            resolve({ ok: true, json: async () => ({ ok: true }) });
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByText("New Padel Club");
    const approveButtons = screen.getAllByRole("button", { name: "Aprobar" });
    fireEvent.click(approveButtons[0]);

    expect(
      await screen.findByRole("button", { name: "Aprobando…" }),
    ).toBeInTheDocument();
    // The second club's row is untouched — its own Approve button stays
    // enabled and unlabeled while only the first row's request is in flight.
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeEnabled();

    resolveApprove?.();
  });

  it("shows an error toast and keeps the club listed when the approve request fails", async () => {
    renderView((url, init) => {
      if (url === "/api/admin/clubs/pending") {
        return jsonResponse({ clubs: [PENDING_CLUB] });
      }
      if (
        url === "/api/admin/clubs/club_1/approve" &&
        init?.method === "POST"
      ) {
        return jsonResponse({ error: "Club is not pending approval" }, false);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    await screen.findByText("New Padel Club");
    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Club is not pending approval",
      ),
    );
    expect(screen.getByText("New Padel Club")).toBeInTheDocument();
  });
});
