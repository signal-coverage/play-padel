// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClubInactiveCard } from "./ClubInactiveCard";

// This card mounts PlanSelectionModal once reactivation succeeds, which
// reads the owner's own email via useAuth (to pre-fill the checkout
// drawer's email step) — mocked directly rather than wrapping every test in
// a real <AuthProvider>, which would drag in Clerk (same pattern as
// PaymentActivationScreen.test.tsx and PlanSelectionModal.test.tsx).
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { email: "owner@club.com" } }),
}));

const REACTIVATED_SUBSCRIPTION = {
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

function renderCard(
  reactivateImpl: () => Promise<unknown> = () =>
    Promise.resolve({
      ok: true,
      json: async () => ({ subscription: REACTIVATED_SUBSCRIPTION }),
    }),
) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/clubs/membership/reactivate" && init?.method === "POST") {
      return reactivateImpl();
    }
    if (url === "/api/clubs/membership") {
      return Promise.resolve({
        ok: true,
        json: async () => ({ subscription: REACTIVATED_SUBSCRIPTION }),
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
      <ClubInactiveCard />
    </QueryClientProvider>,
  );

  return fetchMock;
}

describe("ClubInactiveCard", () => {
  afterEach(() => {
    // This repo's vitest.config.mts does not enable `test.globals`, so
    // @testing-library/react's automatic afterEach(cleanup) registration
    // never fires — clean up the DOM explicitly between tests instead.
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders an enabled 'Renew membership' CTA, not permanently disabled", () => {
    renderCard();

    expect(
      screen.getByRole("heading", { name: "Renew your membership" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Renew membership" }),
    ).not.toBeDisabled();
  });

  it("calls the reactivate mutation and opens PlanSelectionModal on success when clicked", async () => {
    const fetchMock = renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Renew membership" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/clubs/membership/reactivate",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    expect(await screen.findByText("Membership")).toBeInTheDocument();
  });

  it("surfaces an error and does not open the modal when reactivation fails", async () => {
    renderCard(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: "Something went wrong" }),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Renew membership" }));

    await waitFor(() =>
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument(),
    );

    expect(screen.queryByText("Membership")).not.toBeInTheDocument();
  });
});
