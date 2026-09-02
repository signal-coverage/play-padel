// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PaymentStepIndicator } from "./PaymentStepIndicator";

afterEach(() => {
  cleanup();
});

describe("PaymentStepIndicator", () => {
  it("marks the Email step as current when on step 0", () => {
    const { container } = render(<PaymentStepIndicator current={0} />);

    expect(container.querySelector('[data-step="Email"]')).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(container.querySelector('[data-step="Card"]')).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks the Card step as current, and Email as done, when on step 1", () => {
    const { container } = render(<PaymentStepIndicator current={1} />);

    expect(container.querySelector('[data-step="Card"]')).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(container.querySelector('[data-step="Email"]')).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("always shows both step labels", () => {
    render(<PaymentStepIndicator current={0} />);

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
  });
});
