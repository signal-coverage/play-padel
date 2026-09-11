// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PaymentReturnView } from "./PaymentReturnView";

// jsdom doesn't implement EventSource. Deliberately thin — just enough to
// (a) let usePaymentReturnStream construct/tear one down without throwing,
// and (b) let a test dispatch a fake server-pushed "changed" event via the
// last-constructed instance's own `emit`, mirroring how the real
// server-sent event arrives. Same shape as NotificationsBell.test.tsx's own
// MockEventSource.
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

function renderView(
  fetchImpl: (url: string) => Promise<unknown>,
  reservationId: string | null = "res_1",
) {
  vi.stubGlobal("fetch", vi.fn(fetchImpl));
  vi.stubGlobal("EventSource", MockEventSource);
  MockEventSource.instances = [];

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <PaymentReturnView reservationId={reservationId} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PaymentReturnView", () => {
  it("shows a distinct 'contact the club' message when OUR backend call fails", async () => {
    renderView(async () => ({
      ok: false,
      json: async () => ({ error: "Internal error" }),
    }));

    expect(
      await screen.findByText("We couldn't check your payment"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Contact the club directly to confirm your reservation.",
      ),
    ).toBeInTheDocument();
    // Never the genuine-failure copy — a backend bug is not the same thing
    // as a settled, expired payment/hold.
    expect(
      screen.queryByText(/slot hold has expired/i),
    ).not.toBeInTheDocument();
  });

  it("shows the genuine-failure message when the hold has actually expired", async () => {
    renderView(async () => ({
      ok: true,
      json: async () => ({
        reservations: [
          {
            id: "res_1",
            status: "SCHEDULED",
            paymentExpiresAt: new Date(Date.now() - 1000).toISOString(),
            courtName: "Court 1",
            scheduledStart: new Date().toISOString(),
          },
        ],
      }),
    }));

    expect(
      await screen.findByText("Payment didn't complete"),
    ).toBeInTheDocument();
  });

  it("shows the success message once the reservation is CONFIRMED", async () => {
    renderView(async () => ({
      ok: true,
      json: async () => ({
        reservations: [
          {
            id: "res_1",
            status: "CONFIRMED",
            courtName: "Court 1",
            scheduledStart: new Date().toISOString(),
          },
        ],
      }),
    }));

    expect(await screen.findByText("Payment confirmed!")).toBeInTheDocument();
  });

  it("refetches immediately over SSE when the server signals a change, instead of waiting on the 3s poll", async () => {
    let confirmed = false;
    renderView(async () => ({
      ok: true,
      json: async () => ({
        reservations: [
          {
            id: "res_1",
            status: confirmed ? "CONFIRMED" : "SCHEDULED",
            paymentExpiresAt: new Date(
              Date.now() + 10 * 60 * 1000,
            ).toISOString(),
            courtName: "Court 1",
            scheduledStart: new Date().toISOString(),
          },
        ],
      }),
    }));

    expect(
      await screen.findByText("This usually takes a few seconds."),
    ).toBeInTheDocument();

    // The next fetch (triggered by the SSE-driven invalidation below, not a
    // timer) should see the now-CONFIRMED reservation.
    confirmed = true;
    const source = MockEventSource.instances[0];
    source.emit("changed", { status: "CONFIRMED" });

    expect(await screen.findByText("Payment confirmed!")).toBeInTheDocument();
  });

  it("closes the SSE connection when the component unmounts", async () => {
    renderView(async () => ({
      ok: true,
      json: async () => ({
        reservations: [
          {
            id: "res_1",
            status: "SCHEDULED",
            paymentExpiresAt: new Date(
              Date.now() + 10 * 60 * 1000,
            ).toISOString(),
            courtName: "Court 1",
            scheduledStart: new Date().toISOString(),
          },
        ],
      }),
    }));

    await screen.findByText("This usually takes a few seconds.");
    const source = MockEventSource.instances[0];
    expect(source.closed).toBe(false);

    cleanup();

    expect(source.closed).toBe(true);
  });

  it("shows a missing-reference message when there is no reservationId, without fetching", () => {
    renderView(async () => {
      throw new Error("should not be called");
    }, null);

    // Two matches by design: the visible copy and its sr-only twin (see
    // PaymentReturnView.tsx's `statusMessage` live region).
    expect(screen.getAllByText("Missing reservation reference.")).toHaveLength(
      2,
    );
  });
});
