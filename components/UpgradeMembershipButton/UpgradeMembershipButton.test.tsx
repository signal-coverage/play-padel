// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UpgradeMembershipButton } from "./UpgradeMembershipButton";

function renderButton() {
  const fetchMock = vi.fn((url: string) => {
    if (url === "/api/clubs/membership") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          subscription: {
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
          },
        }),
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
      <UpgradeMembershipButton />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("UpgradeMembershipButton", () => {
  it("renders an Upgrade trigger button", () => {
    renderButton();

    expect(
      screen.getByRole("button", { name: /upgrade/i }),
    ).toBeInTheDocument();
  });

  it("opens the shared PlanSelectionModal when clicked, without navigating", () => {
    renderButton();

    fireEvent.click(screen.getByRole("button", { name: /upgrade/i }));

    expect(screen.getByText("Membership")).toBeInTheDocument();
  });
});
