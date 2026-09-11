// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMembershipSubscription } from "./hooks";

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

describe("useMembershipSubscription — real-time SSE stream", () => {
  it("does not open GET /api/clubs/membership/stream when refetchIntervalMs is left off (not awaiting confirmation)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ subscription: null })),
    );
    vi.stubGlobal("EventSource", MockEventSource);

    renderHook(() => useMembershipSubscription(), { wrapper: makeWrapper() });

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(0));
  });

  it("opens GET /api/clubs/membership/stream while awaiting confirmation (refetchIntervalMs set)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ subscription: null })),
    );
    vi.stubGlobal("EventSource", MockEventSource);

    renderHook(() => useMembershipSubscription({ refetchIntervalMs: 4000 }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    expect(MockEventSource.instances[0].url).toBe(
      "/api/clubs/membership/stream",
    );
  });

  it("refetches the subscription immediately when the stream signals a change, instead of waiting on the poll", async () => {
    let confirmed = false;
    const fetchMock = vi.fn().mockImplementation(async () =>
      jsonResponse({
        subscription: confirmed
          ? { clubId: "club_1", status: "TRIALING" }
          : { clubId: "club_1", status: "PENDING" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("EventSource", MockEventSource);

    const { result } = renderHook(
      () => useMembershipSubscription({ refetchIntervalMs: 4000 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.data?.status).toBe("PENDING"));
    const initialFetchCount = fetchMock.mock.calls.length;

    confirmed = true;
    MockEventSource.instances[0].emit("changed", { status: "TRIALING" });

    await waitFor(() => expect(result.current.data?.status).toBe("TRIALING"));
    expect(fetchMock.mock.calls.length).toBeGreaterThan(initialFetchCount);
  });

  it("closes the SSE connection on unmount", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ subscription: null })),
    );
    vi.stubGlobal("EventSource", MockEventSource);

    const { unmount } = renderHook(
      () => useMembershipSubscription({ refetchIntervalMs: 4000 }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0];
    expect(source.closed).toBe(false);

    unmount();

    expect(source.closed).toBe(true);
  });
});
