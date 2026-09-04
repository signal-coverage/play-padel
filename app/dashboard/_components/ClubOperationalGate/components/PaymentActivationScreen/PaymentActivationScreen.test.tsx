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

// next/image's default loader calls out to Next's build-time image
// optimization config, which doesn't exist under Vitest — MercadoPagoConnectionCard
// (now rendered inside this screen once membership is confirmed) uses it for
// its logo, so swap it for a plain <img> the same way that card's own test
// file does.
vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} className={props.className} />
  ),
}));

// This screen mounts PlanSelectionModal, which reads the owner's own email
// via useAuth (to pre-fill the checkout drawer's email step) — mocked
// directly rather than wrapping every test in a real <AuthProvider>, which
// would drag in Clerk (same pattern as PlanSelectionModal's own test file).
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { email: "owner@club.com" } }),
}));

import { PaymentActivationScreen } from "./PaymentActivationScreen";

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

// Branches every fetch this screen (and the two payout-method cards it can
// mount) can issue, by URL — same pattern as ClubOperationalGate.test.tsx's
// renderGate helper.
function renderScreen(subscription: object = PENDING_SUBSCRIPTION) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/clubs/membership") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ subscription }),
      });
    }
    if (url === "/api/clubs/mercadopago/operational-status") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ operational: false, cause: "MP_NOT_CONNECTED" }),
      });
    }
    if (url === "/api/clubs/bank-transfer-account" && (!init || !init.method)) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ account: null }),
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
      <PaymentActivationScreen />
    </QueryClientProvider>,
  );

  return fetchMock;
}

describe("PaymentActivationScreen", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the current plan/status summary and neither payout-method card while PENDING", async () => {
    renderScreen();

    expect(await screen.findByText(/BASIC/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pay Membership" }),
    ).toBeInTheDocument();

    expect(screen.queryByText("Mercado Pago")).not.toBeInTheDocument();
    expect(screen.queryByText("Bank Transfer")).not.toBeInTheDocument();
  });

  it("opens the plan-selection modal when Pay Membership is clicked", async () => {
    renderScreen();

    await screen.findByText(/BASIC/);
    fireEvent.click(screen.getByRole("button", { name: "Pay Membership" }));

    expect(
      await screen.findByRole("heading", { name: "Membership" }),
    ).toBeInTheDocument();
  });

  it("advances to step 2 and renders both payout-method cards once the subscription is ACTIVE", async () => {
    renderScreen({ ...PENDING_SUBSCRIPTION, status: "ACTIVE" });

    // Step 1's own content (the Pay Membership button) is gone — step 2
    // replaces it entirely, it doesn't stack alongside it. Waiting for the
    // real payout content (rather than just "no Pay Membership button") is
    // what actually proves we're past the loading skeleton — that button is
    // equally absent while still loading, so asserting on its absence alone
    // would pass before the ACTIVE data even arrives.
    await waitFor(() => {
      expect(screen.getByText("Bank Transfer")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Pay Membership" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Payment method").closest("[data-step]"),
    ).toHaveAttribute("aria-current", "step");
    // MercadoPagoConnectionCard renders its own "Connect Mercado Pago" CTA
    // when not yet connected.
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Connect Mercado Pago" }),
      ).toBeInTheDocument();
    });
  });

  it("advances to step 2 and renders both payout-method cards once the subscription is TRIALING", async () => {
    renderScreen({ ...PENDING_SUBSCRIPTION, status: "TRIALING" });

    await waitFor(() => {
      expect(screen.getByText("Bank Transfer")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Connect Mercado Pago" }),
      ).toBeInTheDocument();
    });
  });

  it("shows a retry state instead of stuck skeletons when the fetch fails, and recovers on retry", async () => {
    let shouldFail = true;
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/clubs/membership") {
        if (shouldFail) {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: "Internal server error" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ subscription: PENDING_SUBSCRIPTION }),
        });
      }
      if (url === "/api/clubs/mercadopago/operational-status") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            operational: false,
            cause: "MP_NOT_CONNECTED",
          }),
        });
      }
      if (
        url === "/api/clubs/bank-transfer-account" &&
        (!init || !init.method)
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ account: null }),
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
        <PaymentActivationScreen />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/couldn't load your membership/i),
    ).toBeInTheDocument();

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await screen.findByText(/BASIC/);
    expect(
      screen.queryByText(/couldn't load your membership/i),
    ).not.toBeInTheDocument();
  });
});
