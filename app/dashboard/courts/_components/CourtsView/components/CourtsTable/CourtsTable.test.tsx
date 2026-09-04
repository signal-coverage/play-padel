// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CourtsTable } from "./CourtsTable";
import type { CourtRecord } from "../../types";

// jsdom doesn't implement ResizeObserver, but DataTable uses it internally to
// track scroll-edge fades — stub a no-op the same way CourtsView.test.tsx
// does, so mounting a table with actual row data doesn't throw.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const COURT_A: CourtRecord = {
  id: "court_a",
  name: "Court A",
  surface: "concrete",
  indoor: false,
  color: "#2D8A60",
  lighting: false,
  slotDurationMinutes: 90,
  reservationFee: 5000,
  active: true,
};

const COURT_B: CourtRecord = {
  id: "court_b",
  name: "Court B",
  surface: "carpet",
  indoor: true,
  color: "#2563EB",
  lighting: true,
  slotDurationMinutes: 60,
  reservationFee: 4000,
  active: true,
};

function renderTable(
  overrides: Partial<React.ComponentProps<typeof CourtsTable>> = {},
) {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  const onToggleSelect = vi.fn();
  const onToggleSelectAll = vi.fn();

  render(
    <CourtsTable
      courts={[COURT_A, COURT_B]}
      isLoading={false}
      onEdit={vi.fn()}
      onEditAvailability={vi.fn()}
      onEditClosures={vi.fn()}
      onDelete={vi.fn()}
      deletingCourtId={null}
      selectedIds={new Set()}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      {...overrides}
    />,
  );

  return { onToggleSelect, onToggleSelectAll };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CourtsTable selection column", () => {
  it("renders a checkbox per row and calls onToggleSelect with that court's id", () => {
    const { onToggleSelect } = renderTable();

    const checkboxA = screen.getByRole("checkbox", {
      name: `Select ${COURT_A.name}`,
    });
    fireEvent.click(checkboxA);

    expect(onToggleSelect).toHaveBeenCalledWith(COURT_A.id);
  });

  it("calls onToggleSelectAll when the header checkbox is clicked", () => {
    const { onToggleSelectAll } = renderTable();

    const headerCheckbox = screen.getByRole("checkbox", {
      name: /select all/i,
    });
    fireEvent.click(headerCheckbox);

    expect(onToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it("marks a row's checkbox checked when its id is in selectedIds", () => {
    renderTable({ selectedIds: new Set([COURT_A.id]) });

    expect(
      screen.getByRole("checkbox", { name: `Select ${COURT_A.name}` }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("checkbox", { name: `Select ${COURT_B.name}` }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("marks the header checkbox checked only when every court is selected", () => {
    renderTable({ selectedIds: new Set([COURT_A.id, COURT_B.id]) });

    expect(
      screen.getByRole("checkbox", { name: /select all/i }),
    ).toHaveAttribute("aria-checked", "true");
  });
});
