// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AvailabilityRowsEditor } from "./AvailabilityRowsEditor";
import { buildAvailabilityRows } from "@/app/dashboard/courts/_components/CourtsView/utils";

afterEach(() => {
  cleanup();
});

describe("AvailabilityRowsEditor", () => {
  it("is a pure controlled component: toggling a day calls onChange without any internal save action", () => {
    const rows = buildAvailabilityRows([]);
    const onChange = vi.fn();

    render(<AvailabilityRowsEditor rows={rows} onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch", { name: "Sunday" }));

    expect(onChange).toHaveBeenCalledWith(
      rows.map((row) => (row.dayOfWeek === 0 ? { ...row, active: true } : row)),
    );
    expect(
      screen.queryByRole("button", { name: /save schedule/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onChange for every day when Quick setup 'Apply to all' is used", () => {
    const rows = buildAvailabilityRows([]);
    const onChange = vi.fn();

    render(<AvailabilityRowsEditor rows={rows} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /apply to all/i }));

    expect(onChange).toHaveBeenCalledWith(
      rows.map((row) => ({
        ...row,
        active: true,
        startTime: "09:00",
        endTime: "21:00",
      })),
    );
  });

  it("renders the current rows' start/end time values it was given", () => {
    const rows = buildAvailabilityRows([
      { dayOfWeek: 1, startTime: "08:00", endTime: "18:00" },
    ]);

    render(<AvailabilityRowsEditor rows={rows} onChange={vi.fn()} />);

    expect(screen.getByDisplayValue("08:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("18:00")).toBeInTheDocument();
  });
});
