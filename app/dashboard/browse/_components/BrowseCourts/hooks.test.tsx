// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useClubAvailability } from "./hooks";

// jsdom doesn't implement EventSource. Same shape as
// NotificationsBell.test.tsx's own MockEventSource.
class MockEventSource {
  static instances: MockEventSource[] = [];
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();
  closed = false;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  MockEventSource.instances = [];
});

describe("useClubAvailability — real-time SSE stream", () => {
  it("does not open a stream when clubId is null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ courts: [] })),
    );
    vi.stubGlobal("EventSource", MockEventSource);

    renderHook(
      () => useClubAvailability(null, new Date("2026-09-10T12:00:00Z")),
      { wrapper: makeWrapper() },
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("opens GET /api/player/clubs/[clubId]/availability/stream, scoped to the selected club/date", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ courts: [] })),
    );
    vi.stubGlobal("EventSource", MockEventSource);

    renderHook(
      () => useClubAvailability("club_1", new Date("2026-09-10T12:00:00Z")),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    expect(MockEventSource.instances[0].url).toBe(
      "/api/player/clubs/club_1/availability/stream?date=2026-09-10",
    );
  });

  it("refetches the grid the instant the stream signals a change", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ courts: [] }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("EventSource", MockEventSource);

    renderHook(
      () => useClubAvailability("club_1", new Date("2026-09-10T12:00:00Z")),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const initialFetchCount = fetchMock.mock.calls.length;

    MockEventSource.instances[0].emit("changed", {});

    await waitFor(() =>
      expect(fetchMock.mock.calls.length).toBeGreaterThan(initialFetchCount),
    );
  });

  it("closes the SSE connection on unmount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ courts: [] })),
    );
    vi.stubGlobal("EventSource", MockEventSource);

    const { unmount } = renderHook(
      () => useClubAvailability("club_1", new Date("2026-09-10T12:00:00Z")),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0];
    expect(source.closed).toBe(false);

    unmount();

    expect(source.closed).toBe(true);
  });
});
