// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { QuickSetupPanel } from "./QuickSetupPanel";

afterEach(() => {
  cleanup();
});

function renderPanel(props: React.ComponentProps<typeof QuickSetupPanel>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <QuickSetupPanel {...props} />
    </NextIntlClientProvider>,
  );
}

const ALL_DAY_ABBREVIATIONS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

describe("QuickSetupPanel", () => {
  it("renders all 7 day checkboxes, checked by default", () => {
    renderPanel({ onApply: vi.fn() });

    for (const abbreviation of ALL_DAY_ABBREVIATIONS) {
      expect(
        screen.getByRole("checkbox", { name: abbreviation }),
      ).toBeChecked();
    }
  });

  it("unchecks a day's checkbox when clicked, and checks it again on a second click", () => {
    renderPanel({ onApply: vi.fn() });

    const sunday = screen.getByRole("checkbox", { name: "Do" });

    fireEvent.click(sunday);
    expect(sunday).not.toBeChecked();

    fireEvent.click(sunday);
    expect(sunday).toBeChecked();
  });

  it("calls onApply with all 7 days when defaults are untouched", () => {
    const onApply = vi.fn();
    renderPanel({ onApply });

    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const [startTime, endTime, days] = onApply.mock.calls[0];
    expect(startTime).toBe("09:00");
    expect(endTime).toBe("21:00");
    expect([...days].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("excludes an unchecked day from the days passed to onApply", () => {
    const onApply = vi.fn();
    renderPanel({ onApply });

    fireEvent.click(screen.getByRole("checkbox", { name: "Do" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    const [, , days] = onApply.mock.calls[0];
    expect([...days].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("disables the Apply button when every day is unchecked", () => {
    renderPanel({ onApply: vi.fn() });

    for (const abbreviation of ALL_DAY_ABBREVIATIONS) {
      fireEvent.click(screen.getByRole("checkbox", { name: abbreviation }));
    }

    expect(screen.getByRole("button", { name: "Aplicar" })).toBeDisabled();
  });
});
