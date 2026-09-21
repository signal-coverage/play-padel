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
import { createTranslator } from "use-intl/core";
import messages from "@/messages/es.json";

// LandingPricing is now an async Server Component (getTranslations from
// "next-intl/server" is inherently async, unlike the client "next-intl"
// useTranslations hook). There's no request context to read a locale from
// in a Vitest/jsdom run, so this mocks getTranslations with use-intl's own
// createTranslator — the same translator next-intl's server/client
// entrypoints build on internally — rather than inventing an ad hoc stub.
// The nested PricingToggleGrid client island still calls the real
// client-side useTranslations hook, hence the NextIntlClientProvider below.
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    // next-intl's generated global Messages type makes createTranslator's
    // params a strict literal-key union inferred from messages/es.json —
    // this mock accepts any namespace string at the call site (each Server
    // Component passes its own), so the strict inference is deliberately
    // bypassed here rather than fought with per-property casts.
    createTranslator({
      locale: "es",
      messages,
      namespace,
    } as Parameters<typeof createTranslator>[0]),
}));

const { LandingPricing } = await import("./LandingPricing");

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

async function renderPricing() {
  const ui = await LandingPricing();
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("LandingPricing", () => {
  it("renders every customer plan and defaults to monthly pricing", async () => {
    await renderPricing();

    expect(screen.getByRole("heading", { name: "BASIC" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PRO" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PLUS" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MAX" })).toBeInTheDocument();
    expect(screen.getByText("$39.000")).toBeInTheDocument();
    expect(screen.getByText("$59.000")).toBeInTheDocument();
    expect(screen.getByText("$79.000")).toBeInTheDocument();
    expect(screen.getByText("Contactanos")).toBeInTheDocument();
    expect(screen.queryByText("Ahorrás 17%")).not.toBeInTheDocument();
  });

  it("switches all fixed-price cards to annual totals and shows computed savings", async () => {
    await renderPricing();

    const toggle = screen.getByRole("switch", {
      name: "Alternar entre facturación mensual o anual",
    });
    fireEvent.click(toggle);

    expect(toggle).toBeChecked();
    await waitFor(() => {
      expect(screen.getByText("$390.000")).toBeInTheDocument();
      expect(screen.getByText("$590.000")).toBeInTheDocument();
      expect(screen.getByText("$790.000")).toBeInTheDocument();
    });
    expect(screen.getAllByText("/ año")).toHaveLength(3);
    expect(screen.getAllByText("Ahorrás 17%")).toHaveLength(3);
    expect(screen.getByText("Contactanos")).toBeInTheDocument();
  });
});
