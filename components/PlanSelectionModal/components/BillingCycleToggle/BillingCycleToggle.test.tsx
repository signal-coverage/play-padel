// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { BillingCycleToggle } from "./BillingCycleToggle";

afterEach(() => {
  cleanup();
});

describe("BillingCycleToggle", () => {
  it("renders both options", () => {
    render(<BillingCycleToggle value="monthly" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Monthly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annual" })).toBeInTheDocument();
  });

  it("calls onChange with the clicked option's value", () => {
    const onChange = vi.fn();
    render(<BillingCycleToggle value="monthly" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Annual" }));

    expect(onChange).toHaveBeenCalledWith("annual");
  });
});
