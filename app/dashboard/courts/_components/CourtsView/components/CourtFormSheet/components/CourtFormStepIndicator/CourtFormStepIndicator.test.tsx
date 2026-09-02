// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CourtFormStepIndicator } from "./CourtFormStepIndicator";

afterEach(() => {
  cleanup();
});

describe("CourtFormStepIndicator", () => {
  it("marks the Details step as current when on step 0", () => {
    const { container } = render(
      <CourtFormStepIndicator current={0} onChange={vi.fn()} />,
    );

    expect(container.querySelector('[data-step="Details"]')).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(
      container.querySelector('[data-step="Availability"]'),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks the Availability step as current, and Details as done, when on step 1", () => {
    const { container } = render(
      <CourtFormStepIndicator current={1} onChange={vi.fn()} />,
    );

    expect(
      container.querySelector('[data-step="Availability"]'),
    ).toHaveAttribute("aria-current", "step");
    expect(
      container.querySelector('[data-step="Details"]'),
    ).not.toHaveAttribute("aria-current");
  });

  it("always shows both step labels", () => {
    render(<CourtFormStepIndicator current={0} onChange={vi.fn()} />);

    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Availability")).toBeInTheDocument();
  });

  it("is clickable: clicking a step calls onChange with that step's index, from either direction", () => {
    const onChange = vi.fn();
    render(<CourtFormStepIndicator current={0} onChange={onChange} />);

    fireEvent.click(screen.getByText("Availability"));
    expect(onChange).toHaveBeenCalledWith(1);

    cleanup();
    onChange.mockClear();
    render(<CourtFormStepIndicator current={1} onChange={onChange} />);

    fireEvent.click(screen.getByText("Details"));
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
