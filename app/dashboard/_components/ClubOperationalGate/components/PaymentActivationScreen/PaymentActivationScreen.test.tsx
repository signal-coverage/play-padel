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

const MINIMAL_CLUB = {
  id: "club_1",
  name: "Test Club",
  email: "club@example.com",
  timezone: "America/Argentina/Buenos_Aires",
  currency: "ARS",
  plan: "BASIC",
  status: "ACTIVE",
  requiresPrepayment: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: "user_1",
  updatedBy: "user_1",
};

function renderScreen() {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/clubs" && (!init || init.method === undefined)) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ club: MINIMAL_CLUB }),
      });
    }
    if (url === "/api/clubs" && init?.method === "PATCH") {
      const plan = JSON.parse(init.body as string).plan;
      return Promise.resolve({
        ok: true,
        json: async () => ({ club: { ...MINIMAL_CLUB, plan } }),
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
    // Minimal, repo-established idiom for asserting a window.location.href
    // navigation without actually navigating jsdom.
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // never fires — clean up the DOM explicitly between tests instead.
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders with the club's current plan pre-selected", async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /BASIC/ })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    expect(screen.getByRole("radio", { name: /PRO/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("changes the selection when clicking a different plan card", async () => {
    renderScreen();

    const proCard = await screen.findByRole("radio", { name: /PRO/ });
    fireEvent.click(proCard);

    expect(proCard).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /BASIC/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("navigates without calling PATCH when the plan is unchanged", async () => {
    const fetchMock = renderScreen();

    // The submit button is always in the DOM but stays disabled (via
    // !selectedPlan) until the club's current plan finishes loading — wait
    // for that before clicking, otherwise the click is a no-op.
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /BASIC/ })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    const submitButton = screen.getByRole("button", {
      name: "Link Mercado Pago account",
    });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(window.location.href).toBe("/api/clubs/mercadopago/connect"),
    );

    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH"),
    ).toBe(false);
  });

  it("calls PATCH with the new plan then navigates when the plan changed", async () => {
    const fetchMock = renderScreen();

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /BASIC/ })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    const proCard = screen.getByRole("radio", { name: /PRO/ });
    fireEvent.click(proCard);
    expect(proCard).toHaveAttribute("aria-checked", "true");

    const submitButton = screen.getByRole("button", {
      name: "Link Mercado Pago account",
    });
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(window.location.href).toBe("/api/clubs/mercadopago/connect"),
    );

    const patchCall = fetchMock.mock.calls.find(
      ([, init]) => init?.method === "PATCH",
    );
    expect(patchCall).toBeDefined();
    const [, patchInit] = patchCall as [string, RequestInit];
    expect(JSON.parse(patchInit.body as string)).toEqual({ plan: "PRO" });
  });

  it("renders the billing-cycle toggle defaulting to monthly", async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /BASIC/ })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    const monthlyButton = screen.getByRole("button", { name: "Monthly" });
    const annualButton = screen.getByRole("button", { name: "Annual" });
    expect(monthlyButton).toBeInTheDocument();
    expect(annualButton).toBeInTheDocument();

    // Monthly is the default: no "billed annually" pricing note anywhere
    // in the grid yet.
    expect(screen.queryByText(/billed annually/)).not.toBeInTheDocument();
  });

  it("switches plan cards to annual pricing and back when toggling billing cycle", async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /BASIC/ })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Annual" }));

    await waitFor(() => {
      expect(screen.getAllByText(/billed annually/).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Monthly" }));

    await waitFor(() => {
      expect(screen.queryByText(/billed annually/)).not.toBeInTheDocument();
    });
  });

  it("shows a retry state instead of stuck skeletons when the plan fetch fails, and recovers on retry", async () => {
    let shouldFail = true;
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/clubs" && (!init || init.method === undefined)) {
        if (shouldFail) {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: "Internal server error" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ club: MINIMAL_CLUB }),
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
      await screen.findByText(/couldn't load your plan/i),
    ).toBeInTheDocument();

    // No stuck skeletons and no plan grid while the error state is showing.
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    const submitButton = screen.getByRole("button", {
      name: "Link Mercado Pago account",
    });
    expect(submitButton).toBeDisabled();

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /BASIC/ })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    expect(
      screen.queryByText(/couldn't load your plan/i),
    ).not.toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });
});
