// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PaymentReturnView } from "./PaymentReturnView";

function renderView(
  fetchImpl: (url: string) => Promise<unknown>,
  reservationId: string | null = "res_1",
) {
  vi.stubGlobal("fetch", vi.fn(fetchImpl));

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
