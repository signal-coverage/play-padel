// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RenewalModeToggle } from "./RenewalModeToggle";

afterEach(() => {
  cleanup();
});

describe("RenewalModeToggle", () => {
  it("renders both options with the current value checked", () => {
    render(<RenewalModeToggle value="AUTO" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: /auto-renew/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      screen.getByRole("radio", { name: /manual renewal/i }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with the clicked option's value", () => {
    const onChange = vi.fn();
    render(<RenewalModeToggle value="AUTO" onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /manual renewal/i }));

    expect(onChange).toHaveBeenCalledWith("MANUAL");
  });
});
