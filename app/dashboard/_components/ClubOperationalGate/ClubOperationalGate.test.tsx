// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClubOperationalGate } from "./ClubOperationalGate";
import type { ClubOperationalStatusResponse } from "./types";

// This gate mounts PaymentActivationScreen -> PlanSelectionModal, which
// reads the owner's own email via useAuth (to pre-fill the checkout
// drawer's email step) — mocked directly rather than wrapping every test
// in a real <AuthProvider>, which would drag in Clerk (same pattern as
// PlanSelectionModal's own test file).
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { email: "owner@club.com" } }),
}));

// Minimal valid membership subscription shape for
// PaymentActivationScreen's GET /api/clubs/membership fetch.
const PENDING_SUBSCRIPTION = {
  id: "sub_1",
  clubId: "club_1",
  plan: "BASIC",
  pendingPlan: null,
  cycle: "MONTHLY",
  pendingCycle: null,
  renewalMode: "AUTO",
  status: "PENDING",
  currency: "ARS",
  trialEndsAt: null,
  currentPeriodEnd: null,
};

function renderGate(response: ClubOperationalStatusResponse) {
  // Once PaymentActivationScreen also calls fetch("/api/clubs/membership")
  // from inside the same test, a single undiscriminating mock would hand it
  // the operational-status shape instead of { subscription }, breaking the
  // screen. Branch by URL so each endpoint gets the shape its caller
  // actually expects.
  const fetchMock = vi.fn((url: string) => {
    if (url.includes("/mercadopago/operational-status")) {
      return Promise.resolve({ ok: true, json: async () => response });
    }
    if (url === "/api/clubs/membership") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ subscription: PENDING_SUBSCRIPTION }),
      });
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ClubOperationalGate>
        <button type="button">Create court</button>
      </ClubOperationalGate>
    </QueryClientProvider>,
  );

  return fetchMock;
}

describe("ClubOperationalGate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // (which relies on a global `afterEach`) never fires — clean up the DOM
    // explicitly between tests instead, or renders stack across cases.
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders children normally when operational", async () => {
    renderGate({ operational: true, cause: null });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Create court" }),
      ).toBeInTheDocument(),
    );

    expect(screen.queryByText("Payment activation")).not.toBeInTheDocument();
    expect(screen.queryByText("Renew your membership")).not.toBeInTheDocument();
  });

  it("shows a neutral loading state, neither children nor a gate, while status is loading", () => {
    // No fetch ever resolves in this test, so the query stays in its
    // loading state for the whole assertion window.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ClubOperationalGate>
          <button type="button">Create court</button>
        </ClubOperationalGate>
      </QueryClientProvider>,
    );

    expect(
      screen.queryByRole("button", { name: "Create court" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Payment activation")).not.toBeInTheDocument();
    expect(screen.queryByText("Renew your membership")).not.toBeInTheDocument();
    expect(screen.getByText("Loading dashboard…")).toBeInTheDocument();
  });

  it("does not mount children at all when MP_NOT_CONNECTED, and renders the payment activation screen instead", async () => {
    renderGate({ operational: false, cause: "MP_NOT_CONNECTED" });

    const heading = await screen.findByRole("heading", {
      name: "Payment activation",
    });
    expect(heading).toBeInTheDocument();

    // The membership summary and "Pay Membership" action show once the
    // subscription snapshot loads; the payout-method cards (Mercado
    // Pago/bank transfer) stay hidden entirely until membership is confirmed
    // (spec's "Two Separate Membership Actions").
    await waitFor(() => {
      expect(screen.getByText(/BASIC/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Pay Membership" }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Bank Transfer")).not.toBeInTheDocument();

    // This is the actual point of the fix: the gated-out page content must
    // be entirely absent from the DOM, not just visually hidden — no blur
    // wrapper, no aria-hidden clone, nothing to query by text either.
    expect(screen.queryByText("Create court")).not.toBeInTheDocument();
    expect(document.querySelector(".blur-sm")).not.toBeInTheDocument();

    expect(screen.queryByText("Renew your membership")).not.toBeInTheDocument();
  });

  it("does not mount children at all when CLUB_INACTIVE, and renders the disabled CTA instead", async () => {
    renderGate({ operational: false, cause: "CLUB_INACTIVE" });

    const heading = await screen.findByRole("heading", {
      name: "Renew your membership",
    });
    expect(heading).toBeInTheDocument();

    expect(screen.queryByText("Create court")).not.toBeInTheDocument();
    expect(document.querySelector(".blur-sm")).not.toBeInTheDocument();

    // The CTA is no longer a permanent dead end — it triggers the
    // CANCELLED -> PENDING reactivation flow, so it must render enabled
    // (see ClubInactiveCard.test.tsx for the click-through behavior).
    const cta = screen.getByRole("button", { name: "Renew membership" });
    expect(cta).not.toBeDisabled();

    expect(screen.queryByText("Payment activation")).not.toBeInTheDocument();
  });

  it("shows the MP_NOT_CONNECTED screen, not the inactive one, when both causes would apply", async () => {
    // The backend (getClubOperationalStatus) already resolves precedence and
    // returns a single cause — this test asserts the component honors
    // whatever single cause it receives without re-deriving precedence.
    renderGate({ operational: false, cause: "MP_NOT_CONNECTED" });

    await screen.findByRole("heading", { name: "Payment activation" });

    expect(screen.queryByText("Renew your membership")).not.toBeInTheDocument();
  });
});
