// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { PaymentStepIndicator } from "./PaymentStepIndicator";

afterEach(() => {
  cleanup();
});

function renderIndicator(current: 0 | 1) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PaymentStepIndicator current={current} />
    </NextIntlClientProvider>,
  );
}

describe("PaymentStepIndicator", () => {
  it("marks the Email step as current when on step 0", () => {
    const { container } = renderIndicator(0);

    expect(container.querySelector('[data-step="Email"]')).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(
      container.querySelector('[data-step="Tarjeta"]'),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the Card step as current, and Email as done, when on step 1", () => {
    const { container } = renderIndicator(1);

    expect(container.querySelector('[data-step="Tarjeta"]')).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(container.querySelector('[data-step="Email"]')).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("always shows both step labels", () => {
    renderIndicator(0);

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Tarjeta")).toBeInTheDocument();
  });
});
