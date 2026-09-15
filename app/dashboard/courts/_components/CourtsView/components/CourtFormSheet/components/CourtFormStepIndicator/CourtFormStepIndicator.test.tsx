// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { CourtFormStepIndicator } from "./CourtFormStepIndicator";

afterEach(() => {
  cleanup();
});

function renderIndicator(current: 0 | 1 | 2 | 3) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CourtFormStepIndicator current={current} />
    </NextIntlClientProvider>,
  );
}

describe("CourtFormStepIndicator", () => {
  it("marks the Details step as current when on step 0", () => {
    const { container } = renderIndicator(0);

    expect(container.querySelector('[data-step="details"]')).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(
      container.querySelector('[data-step="availability"]'),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the Availability step as current, and every earlier step as done, when on step 3", () => {
    const { container } = renderIndicator(3);

    expect(
      container.querySelector('[data-step="availability"]'),
    ).toHaveAttribute("aria-current", "step");
    expect(
      container.querySelector('[data-step="details"]'),
    ).not.toHaveAttribute("aria-current");
    expect(
      container.querySelector('[data-step="pricing"]'),
    ).not.toHaveAttribute("aria-current");
  });

  it("always shows all four step labels", () => {
    renderIndicator(0);

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Attributes")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("Availability")).toBeInTheDocument();
  });

  // Global convention (see PaymentStepIndicator/ActivationStepIndicator/
  // OnboardingWizard's StepIndicator, none of which are clickable either):
  // a step only ever advances via the modal's own Back/Next/Create buttons.
  it("is not clickable — clicking a step label does nothing, there is no button to click", () => {
    renderIndicator(0);

    const availabilityLabel = screen.getByText("Availability");
    expect(
      screen.queryByRole("button", { name: /availability/i }),
    ).not.toBeInTheDocument();

    expect(() => fireEvent.click(availabilityLabel)).not.toThrow();
    expect(
      screen.getByText("Details").closest('[data-step="details"]'),
    ).toHaveAttribute("aria-current", "step");
  });
});
