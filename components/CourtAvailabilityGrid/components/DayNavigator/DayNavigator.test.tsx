// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DayNavigator } from "./DayNavigator";

describe("DayNavigator minDate guard", () => {
  afterEach(() => {
    cleanup();
  });

  it("disables Previous day once date is already on minDate's day", () => {
    const onDateChange = vi.fn();
    render(
      <DayNavigator
        date={new Date(2026, 0, 15)}
        minDate={new Date(2026, 0, 15)}
        onDateChange={onDateChange}
      />,
    );

    expect(screen.getByLabelText("Previous day")).toBeDisabled();
  });

  it("clicking a disabled Previous day never calls onDateChange", () => {
    const onDateChange = vi.fn();
    render(
      <DayNavigator
        date={new Date(2026, 0, 15)}
        minDate={new Date(2026, 0, 15)}
        onDateChange={onDateChange}
      />,
    );

    fireEvent.click(screen.getByLabelText("Previous day"));
    expect(onDateChange).not.toHaveBeenCalled();
  });

  it("keeps Previous day enabled while date is still after minDate's day", () => {
    const onDateChange = vi.fn();
    render(
      <DayNavigator
        date={new Date(2026, 0, 16)}
        minDate={new Date(2026, 0, 15)}
        onDateChange={onDateChange}
      />,
    );

    expect(screen.getByLabelText("Previous day")).not.toBeDisabled();
  });

  it("ignores time-of-day when comparing date against minDate", () => {
    const onDateChange = vi.fn();
    render(
      <DayNavigator
        date={new Date(2026, 0, 15, 23, 59)}
        minDate={new Date(2026, 0, 15, 0, 0)}
        onDateChange={onDateChange}
      />,
    );

    expect(screen.getByLabelText("Previous day")).toBeDisabled();
  });

  it("never restricts Next day based on minDate", () => {
    const onDateChange = vi.fn();
    render(
      <DayNavigator
        date={new Date(2026, 0, 15)}
        minDate={new Date(2026, 0, 15)}
        onDateChange={onDateChange}
      />,
    );

    expect(screen.getByLabelText("Next day")).not.toBeDisabled();
  });

  it("leaves Previous day enabled when no minDate is given", () => {
    const onDateChange = vi.fn();
    render(
      <DayNavigator date={new Date(2026, 0, 15)} onDateChange={onDateChange} />,
    );

    expect(screen.getByLabelText("Previous day")).not.toBeDisabled();
  });
});
