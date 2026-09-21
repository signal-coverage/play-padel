// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
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
vi.mock("../ClubClosuresCard", () => ({
  ClubClosuresCard: () => null,
}));

function renderTabs() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <ClubSettingsTabs />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe("ClubSettingsTabs", () => {
  afterEach(() => {
    cleanup();
  });

  it('renders "Club settings" as the first tab\'s label, not "Basic information"', () => {
    renderTabs();

    expect(
      screen.getByRole("tab", { name: /configuración del club/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /^información básica$/i }),
    ).not.toBeInTheDocument();
  });

  it('renders a "Closures" tab immediately after "Schedule"', () => {
    renderTabs();

    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    const scheduleIndex = tabs.findIndex((label) => label === "Horario");
    const closuresIndex = tabs.findIndex((label) => label === "Cierres");

    expect(scheduleIndex).toBeGreaterThanOrEqual(0);
    expect(closuresIndex).toBe(scheduleIndex + 1);
  });
});
