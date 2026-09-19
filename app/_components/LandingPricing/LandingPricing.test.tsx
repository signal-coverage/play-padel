// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { LandingPricing } from "./LandingPricing";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPricing() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LandingPricing />
    </NextIntlClientProvider>,
  );
}

describe("LandingPricing", () => {
  it("renders every customer plan and defaults to monthly pricing", () => {
    renderPricing();

    expect(screen.getByRole("heading", { name: "BASIC" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PRO" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PLUS" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MAX" })).toBeInTheDocument();
    expect(screen.getByText("$39.000")).toBeInTheDocument();
    expect(screen.getByText("$59.000")).toBeInTheDocument();
    expect(screen.getByText("$79.000")).toBeInTheDocument();
    expect(screen.getByText("Contact us")).toBeInTheDocument();
    expect(screen.queryByText("Save 17%")).not.toBeInTheDocument();
  });

  it("switches all fixed-price cards to annual totals and shows computed savings", async () => {
    renderPricing();

    const toggle = screen.getByRole("switch", {
      name: "Toggle monthly or annual billing",
    });
    fireEvent.click(toggle);

    expect(toggle).toBeChecked();
    await waitFor(() => {
      expect(screen.getByText("$390.000")).toBeInTheDocument();
      expect(screen.getByText("$590.000")).toBeInTheDocument();
      expect(screen.getByText("$790.000")).toBeInTheDocument();
    });
    expect(screen.getAllByText("/ year")).toHaveLength(3);
    expect(screen.getAllByText("Save 17%")).toHaveLength(3);
    expect(screen.getByText("Contact us")).toBeInTheDocument();
  });
});
