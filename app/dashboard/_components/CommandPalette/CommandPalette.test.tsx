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
import { CommandPalette } from "./CommandPalette";
import type { SystemRole } from "@/providers/auth-provider";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// jsdom doesn't implement ResizeObserver, but cmdk's Command list uses it
// internally to measure item heights — stub a no-op so mounting the open
// dialog doesn't throw.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderCommandPalette(
  role: SystemRole,
  fetchMock: ReturnType<typeof vi.fn>,
) {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  // jsdom doesn't implement scrollIntoView either — cmdk calls it on the
  // active item whenever the visible list changes.
  Element.prototype.scrollIntoView = vi.fn();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <CommandPalette role={role} />
    </QueryClientProvider>,
  );

  // The dialog starts closed (controlled `open` state) — open it via the
  // same Ctrl+K shortcut a real user would use, so CommandItems actually
  // mount into the DOM.
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
}

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    pushMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lists only Dashboard when the owner's club is confirmed non-operational", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ operational: false }),
    });
    renderCommandPalette("owner", fetchMock);

    await waitFor(() =>
      expect(screen.queryByText("Courts")).not.toBeInTheDocument(),
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Reservations")).not.toBeInTheDocument();
    expect(screen.queryByText("Club Settings")).not.toBeInTheDocument();
    expect(screen.queryByText("Audit Log")).not.toBeInTheDocument();
  });

  it("never fetches operational status for a player, and lists the full player nav", async () => {
    const fetchMock = vi.fn();
    renderCommandPalette("player", fetchMock);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Browse Courts")).toBeInTheDocument();

    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
