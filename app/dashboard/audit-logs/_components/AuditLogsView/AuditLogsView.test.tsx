// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuditLogsView } from "./AuditLogsView";

// jsdom doesn't implement ResizeObserver, but DataTable relies on it
// internally to measure scroll fade state (same stub as
// AdminStatusView.test.tsx / CourtsTable.test.tsx).
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
      <AuditLogsView />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

const LOG_A = {
  id: "log_1",
  clubId: "club_1",
  userId: "user_1",
  userDisplayName: "Nicolas Sanchez",
  action: "COURT_CREATED",
  entity: "Court",
  entityId: "court_1",
  timestamp: "2026-09-04T08:00:00.000Z",
};

describe("AuditLogsView", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("gives the audit log table extra minimum height on mobile with a trailing spacer, while leaving desktop sizing untouched", async () => {
    renderView(
      vi.fn().mockResolvedValue(jsonResponse({ logs: [LOG_A], total: 1 })),
    );

    await waitFor(() =>
      expect(screen.getByText("Nicolas Sanchez")).toBeInTheDocument(),
    );

    // Same fix as PlayersDirectory's table (see its own comments for the
    // full explanation). The trailing spacer sits at the very end of the
    // page (after the pagination footer), since that's genuinely the last
    // thing rendered before <main>'s scrollable content ends on mobile.
    const table = screen.getByRole("table");
    const wrapper = table.closest(".rounded-sm.border");
    expect(wrapper?.className).toContain("min-h-[60svh]");
    expect(wrapper?.className).toMatch(/\bmd:min-h-0\b/);

    const pageFooter = screen.getByText(/page 1 of 1/i).closest("div");
    const spacer = pageFooter?.nextElementSibling as HTMLElement | null;
    expect(spacer).not.toBeNull();
    expect(spacer?.getAttribute("aria-hidden")).toBe("true");
    expect(spacer?.className).toMatch(/\bh-8\b/);
    expect(spacer?.className).toMatch(/\bmd:hidden\b/);
  });
});
