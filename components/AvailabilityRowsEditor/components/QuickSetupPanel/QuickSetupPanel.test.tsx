// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QuickSetupPanel } from "./QuickSetupPanel";

afterEach(() => {
  cleanup();
});

const ALL_DAY_ABBREVIATIONS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

describe("QuickSetupPanel", () => {
  it("renders all 7 day checkboxes, checked by default", () => {
    render(<QuickSetupPanel onApply={vi.fn()} />);

    for (const abbreviation of ALL_DAY_ABBREVIATIONS) {
      expect(
        screen.getByRole("checkbox", { name: abbreviation }),
      ).toBeChecked();
    }
  });

  it("unchecks a day's checkbox when clicked, and checks it again on a second click", () => {
    render(<QuickSetupPanel onApply={vi.fn()} />);

    const sunday = screen.getByRole("checkbox", { name: "Su" });

    fireEvent.click(sunday);
    expect(sunday).not.toBeChecked();

    fireEvent.click(sunday);
    expect(sunday).toBeChecked();
  });

  it("calls onApply with all 7 days when defaults are untouched", () => {
    const onApply = vi.fn();
    render(<QuickSetupPanel onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const [startTime, endTime, days] = onApply.mock.calls[0];
    expect(startTime).toBe("09:00");
    expect(endTime).toBe("21:00");
    expect([...days].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("excludes an unchecked day from the days passed to onApply", () => {
    const onApply = vi.fn();
    render(<QuickSetupPanel onApply={onApply} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Su" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    const [, , days] = onApply.mock.calls[0];
    expect([...days].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("disables the Apply button when every day is unchecked", () => {
    render(<QuickSetupPanel onApply={vi.fn()} />);

    for (const abbreviation of ALL_DAY_ABBREVIATIONS) {
      fireEvent.click(screen.getByRole("checkbox", { name: abbreviation }));
    }

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });
});
