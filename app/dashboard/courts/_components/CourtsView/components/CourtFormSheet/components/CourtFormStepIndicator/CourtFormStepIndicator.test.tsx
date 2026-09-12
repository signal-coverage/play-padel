// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CourtFormStepIndicator } from "./CourtFormStepIndicator";

afterEach(() => {
  cleanup();
});

describe("CourtFormStepIndicator", () => {
  it("marks the Details step as current when on step 0", () => {
    const { container } = render(<CourtFormStepIndicator current={0} />);

    expect(container.querySelector('[data-step="Details"]')).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(
      container.querySelector('[data-step="Availability"]'),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the Availability step as current, and every earlier step as done, when on step 3", () => {
    const { container } = render(<CourtFormStepIndicator current={3} />);

    expect(
      container.querySelector('[data-step="Availability"]'),
    ).toHaveAttribute("aria-current", "step");
    expect(
      container.querySelector('[data-step="Details"]'),
    ).not.toHaveAttribute("aria-current");
    expect(
      container.querySelector('[data-step="Pricing"]'),
    ).not.toHaveAttribute("aria-current");
  });

  it("always shows all four step labels", () => {
    render(<CourtFormStepIndicator current={0} />);

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Attributes")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("Availability")).toBeInTheDocument();
  });

  // Global convention (see PaymentStepIndicator/ActivationStepIndicator/
  // OnboardingWizard's StepIndicator, none of which are clickable either):
  // a step only ever advances via the modal's own Back/Next/Create buttons.
  it("is not clickable — clicking a step label does nothing, there is no button to click", () => {
    render(<CourtFormStepIndicator current={0} />);

    const availabilityLabel = screen.getByText("Availability");
    expect(
      screen.queryByRole("button", { name: /availability/i }),
    ).not.toBeInTheDocument();

    expect(() => fireEvent.click(availabilityLabel)).not.toThrow();
    expect(
      screen.getByText("Details").closest('[data-step="Details"]'),
    ).toHaveAttribute("aria-current", "step");
  });
});
