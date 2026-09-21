// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { AvailabilityRowsEditor } from "./AvailabilityRowsEditor";
import { buildAvailabilityRows } from "@/app/dashboard/courts/_components/CourtsView/utils";

afterEach(() => {
  cleanup();
});

function renderEditor(
  props: React.ComponentProps<typeof AvailabilityRowsEditor>,
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AvailabilityRowsEditor {...props} />
    </NextIntlClientProvider>,
  );
}

describe("AvailabilityRowsEditor", () => {
  it("is a pure controlled component: toggling a day calls onChange without any internal save action", () => {
    const rows = buildAvailabilityRows([]);
    const onChange = vi.fn();

    renderEditor({ rows, onChange });

    fireEvent.click(screen.getByRole("switch", { name: "Domingo" }));

    expect(onChange).toHaveBeenCalledWith(
      rows.map((row) => (row.dayOfWeek === 0 ? { ...row, active: true } : row)),
    );
    expect(
      screen.queryByRole("button", { name: /save schedule/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onChange for every day when Quick setup 'Apply' is used with every day selected", () => {
    const rows = buildAvailabilityRows([]);
    const onChange = vi.fn();

    renderEditor({ rows, onChange });

    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onChange).toHaveBeenCalledWith(
      rows.map((row) => ({
        ...row,
        active: true,
        startTime: "09:00",
        endTime: "21:00",
      })),
    );
  });

  it("only applies Quick setup to the days still selected, leaving other rows untouched", () => {
    const rows = buildAvailabilityRows([]);
    const onChange = vi.fn();

    renderEditor({ rows, onChange });

    fireEvent.click(screen.getByRole("checkbox", { name: "Do" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onChange).toHaveBeenCalledWith(
      rows.map((row) =>
        row.dayOfWeek === 0
          ? row
          : { ...row, active: true, startTime: "09:00", endTime: "21:00" },
      ),
    );
  });

  it("renders the current rows' start/end time values it was given", () => {
    const rows = buildAvailabilityRows([
      { dayOfWeek: 1, startTime: "08:00", endTime: "18:00" },
    ]);

    renderEditor({ rows, onChange: vi.fn() });

    expect(screen.getByDisplayValue("08:00")).toBeInTheDocument();
    expect(screen.getByDisplayValue("18:00")).toBeInTheDocument();
  });

  // "split" layout — CourtFormSheet's own fixed-height Availability step,
  // where only the day-list column (not Quick setup, not the whole modal)
  // should ever scroll.
  describe('layout="split"', () => {
    it("still renders Quick setup and every day, and Quick setup still applies to all days", () => {
      const rows = buildAvailabilityRows([]);
      const onChange = vi.fn();

      renderEditor({ rows, onChange, layout: "split" });

      expect(
        screen.getByRole("button", { name: "Aplicar" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("switch", { name: "Domingo" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("switch", { name: "Sábado" }),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

      expect(onChange).toHaveBeenCalledWith(
        rows.map((row) => ({
          ...row,
          active: true,
          startTime: "09:00",
          endTime: "21:00",
        })),
      );
    });

    it("puts the day list in its own scrollable column, separate from Quick setup", () => {
      const rows = buildAvailabilityRows([]);

      const { container } = renderEditor({
        rows,
        onChange: vi.fn(),
        layout: "split",
      });

      const dayList = screen
        .getByRole("switch", { name: "Domingo" })
        .closest(".overflow-y-auto");
      expect(dayList).not.toBeNull();
      // Quick setup lives OUTSIDE that scrollable column, not inside it.
      expect(
        dayList?.contains(screen.getByRole("button", { name: "Aplicar" })),
      ).toBe(false);
      // A vertical Separator sits between the two columns.
      expect(
        container.querySelector('[data-orientation="vertical"]'),
      ).toBeInTheDocument();
    });
  });
});
