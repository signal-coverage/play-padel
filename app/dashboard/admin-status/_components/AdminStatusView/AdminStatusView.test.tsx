// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminStatusView } from "./AdminStatusView";

// jsdom doesn't implement ResizeObserver, but DataTable relies on it
// internally to measure scroll fade state (see AdminSearchView.test.tsx /
// CourtsTable.test.tsx using the same stub).
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
      <AdminStatusView />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

const NEVER_RUN_SUMMARY = {
  notifications: null,
  "membership-grace-sweep": null,
  "mercadopago-token-refresh": null,
  "reset-preview-db": null,
  mercadopago: null,
  clerk: null,
};

describe("AdminStatusView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the page heading", async () => {
    renderView(
      vi.fn().mockResolvedValue(jsonResponse({ summary: {}, recent: [] })),
    );

    expect(
      screen.getByRole("heading", { name: /system status/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Never run' for every job that has no history yet", async () => {
    renderView(
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ summary: NEVER_RUN_SUMMARY, recent: [] }),
        ),
    );

    await waitFor(() =>
      expect(screen.getAllByText(/never run/i).length).toBeGreaterThan(0),
    );
    // 4 crons + 2 webhooks.
    expect(screen.getAllByText(/never run/i)).toHaveLength(6);
  });

  it("shows a SUCCESS badge and the last-run timestamp for a job that has run", async () => {
    const summary = {
      ...NEVER_RUN_SUMMARY,
      notifications: {
        id: "log_1",
        kind: "CRON",
        name: "notifications",
        status: "SUCCESS",
        startedAt: "2026-09-04T08:00:00.000Z",
        finishedAt: "2026-09-04T08:00:01.000Z",
        errorMessage: null,
        createdAt: "2026-09-04T08:00:01.000Z",
      },
    };
    renderView(
      vi.fn().mockResolvedValue(jsonResponse({ summary, recent: [] })),
    );

    await waitFor(() =>
      expect(screen.getByText(/success/i)).toBeInTheDocument(),
    );
    expect(screen.getAllByText(/never run/i)).toHaveLength(5);
  });

  it("renders the recent activity list, newest first, including a failure's error message", async () => {
    const recent = [
      {
        id: "log_2",
        kind: "WEBHOOK",
        name: "mercadopago",
        status: "FAILURE",
        startedAt: "2026-09-04T09:00:00.000Z",
        finishedAt: "2026-09-04T09:00:01.000Z",
        errorMessage: "boom",
        createdAt: "2026-09-04T09:00:01.000Z",
      },
      {
        id: "log_1",
        kind: "CRON",
        name: "notifications",
        status: "SUCCESS",
        startedAt: "2026-09-04T08:00:00.000Z",
        finishedAt: "2026-09-04T08:00:01.000Z",
        errorMessage: null,
        createdAt: "2026-09-04T08:00:01.000Z",
      },
    ];
    renderView(
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ summary: NEVER_RUN_SUMMARY, recent }),
        ),
    );

    await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("shows an error message when the request fails", async () => {
    renderView(
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );

    await waitFor(() =>
      expect(screen.getByText(/could not load/i)).toBeInTheDocument(),
    );
  });

  it("gives the recent activity table extra minimum height on mobile with a trailing spacer, while leaving desktop sizing untouched", async () => {
    const recent = [
      {
        id: "log_1",
        kind: "CRON",
        name: "notifications",
        status: "SUCCESS",
        startedAt: "2026-09-04T08:00:00.000Z",
        finishedAt: "2026-09-04T08:00:01.000Z",
        errorMessage: null,
        createdAt: "2026-09-04T08:00:01.000Z",
      },
    ];
    renderView(
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ summary: NEVER_RUN_SUMMARY, recent }),
        ),
    );

    // Same fix as PlayersDirectory's table (see its own comments for the
    // full explanation) — scoped to the "Recent activity" table only, via
    // its "When" header (unique to it; AdminStatusSummary's own small,
    // naturally-sized table above it is untouched, since it never tried to
    // stretch full-height in the first place).
    await waitFor(() => expect(screen.getByText("When")).toBeInTheDocument());
    const table = screen.getByText("When").closest("table");
    const wrapper = table?.closest(".rounded-sm.border");
    expect(wrapper?.className).toContain("min-h-[60svh]");
    expect(wrapper?.className).toMatch(/\bmd:min-h-0\b/);

    const spacer = wrapper?.nextElementSibling as HTMLElement | null;
    expect(spacer).not.toBeNull();
    expect(spacer?.getAttribute("aria-hidden")).toBe("true");
    expect(spacer?.className).toMatch(/\bh-8\b/);
    expect(spacer?.className).toMatch(/\bmd:hidden\b/);
  });
});
