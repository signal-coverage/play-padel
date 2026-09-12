// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useDayReservations } from "./hooks";

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

describe("useDayReservations — real-time SSE stream", () => {
  it("opens GET /api/clubs/reservations/stream, scoped to the selected date", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ reservations: [] })),
    );
    vi.stubGlobal("EventSource", MockEventSource);

    renderHook(() => useDayReservations(new Date("2026-09-10T12:00:00Z")), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    expect(MockEventSource.instances[0].url).toBe(
      "/api/clubs/reservations/stream?date=2026-09-10",
    );
  });

  it("refetches both reservations and court-slots the instant the stream signals a change", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ reservations: [] }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("EventSource", MockEventSource);

    renderHook(() => useDayReservations(new Date("2026-09-10T12:00:00Z")), {
      wrapper: makeWrapper(),
    });

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
      vi.fn().mockResolvedValue(jsonResponse({ reservations: [] })),
    );
    vi.stubGlobal("EventSource", MockEventSource);

    const { unmount } = renderHook(
      () => useDayReservations(new Date("2026-09-10T12:00:00Z")),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0];
    expect(source.closed).toBe(false);

    unmount();

    expect(source.closed).toBe(true);
  });
});
