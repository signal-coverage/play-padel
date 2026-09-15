// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { LocaleSwitcher } from "./LocaleSwitcher";

const { setUserLocaleMock, refreshMock } = vi.hoisted(() => ({
  setUserLocaleMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("@/i18n/localeActions", () => ({
  setUserLocale: setUserLocaleMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

function renderSwitcher(locale: "en" | "es") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  setUserLocaleMock.mockReset().mockResolvedValue(undefined);
  refreshMock.mockReset();
});

describe("LocaleSwitcher", () => {
  it("renders as a single toggle button showing the CURRENT locale's flag + code", () => {
    renderSwitcher("en");

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("🇺🇸");
    expect(button).toHaveTextContent("en");
  });

  it("switches to Spanish when clicked from English", async () => {
    renderSwitcher("en");

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(setUserLocaleMock).toHaveBeenCalledWith("es"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("switches to English when clicked from Spanish", async () => {
    renderSwitcher("es");

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(setUserLocaleMock).toHaveBeenCalledWith("en"));
  });
});
