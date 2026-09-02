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
import { PaymentActivationScreen } from "./PaymentActivationScreen";

// This screen mounts PlanSelectionModal, which reads the owner's own email
// via useAuth (to pre-fill the checkout drawer's email step) — mocked
// directly rather than wrapping every test in a real <AuthProvider>, which
// would drag in Clerk (same pattern as PlanSelectionModal's own test file).
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { email: "owner@club.com" } }),
}));

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

function renderScreen(subscription: object = PENDING_SUBSCRIPTION) {
  const fetchMock = vi.fn((url: string) => {
    if (url === "/api/clubs/membership") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ subscription }),
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

  it("renders the current plan/status summary and a disabled Link MP action while PENDING", async () => {
    renderScreen();

    expect(await screen.findByText(/BASIC/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Link Mercado Pago account" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Pay Membership" }),
    ).toBeInTheDocument();
  });

  it("opens the plan-selection modal when Pay Membership is clicked", async () => {
    renderScreen();

    await screen.findByText(/BASIC/);
    fireEvent.click(screen.getByRole("button", { name: "Pay Membership" }));

    expect(await screen.findByText("Membership")).toBeInTheDocument();
  });

  it("shows 'Membership Active' and enables Link MP once the subscription is ACTIVE", async () => {
    renderScreen({ ...PENDING_SUBSCRIPTION, status: "ACTIVE" });

    expect(await screen.findByText("Membership Active")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Link Mercado Pago account" }),
    ).not.toBeDisabled();
  });

  it("navigates to the connect route when Link Mercado Pago account is clicked while confirmed", async () => {
    renderScreen({ ...PENDING_SUBSCRIPTION, status: "TRIALING" });

    await screen.findByText("Membership Active");
    fireEvent.click(
      screen.getByRole("button", { name: "Link Mercado Pago account" }),
    );

    await waitFor(() =>
      expect(window.location.href).toBe("/api/clubs/mercadopago/connect"),
    );
  });

  it("shows a retry state instead of stuck skeletons when the fetch fails, and recovers on retry", async () => {
    let shouldFail = true;
    const fetchMock = vi.fn((url: string) => {
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

    const linkButton = screen.getByRole("button", {
      name: "Link Mercado Pago account",
    });
    expect(linkButton).toBeDisabled();

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await screen.findByText(/BASIC/);
    expect(
      screen.queryByText(/couldn't load your membership/i),
    ).not.toBeInTheDocument();
  });
});
