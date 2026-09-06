// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClubSettingsTabs } from "./ClubSettingsTabs";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../ClubSettingsView", () => ({
  ClubSettingsView: () => null,
}));
vi.mock("../OperatingHoursSettingsCard", () => ({
  OperatingHoursSettingsCard: () => null,
}));
vi.mock("../MercadoPagoConnectionCard", () => ({
  MercadoPagoConnectionCard: () => null,
}));
vi.mock("../BankTransferAccountSettingsCard", () => ({
  BankTransferAccountSettingsCard: () => null,
}));

function renderTabs() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ClubSettingsTabs />
    </QueryClientProvider>,
  );
}

describe("ClubSettingsTabs", () => {
  afterEach(() => {
    cleanup();
  });

  it('renders "Club settings" as the first tab\'s label, not "Basic information"', () => {
    renderTabs();

    expect(
      screen.getByRole("tab", { name: /club settings/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /^basic information$/i }),
    ).not.toBeInTheDocument();
  });
});
