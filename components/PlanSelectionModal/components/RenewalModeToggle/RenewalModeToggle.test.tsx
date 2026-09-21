// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { RenewalModeToggle } from "./RenewalModeToggle";

afterEach(() => {
  cleanup();
});

function renderToggle(props: React.ComponentProps<typeof RenewalModeToggle>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <RenewalModeToggle {...props} />
    </NextIntlClientProvider>,
  );
}

describe("RenewalModeToggle", () => {
  it("renders both options with the current value checked", () => {
    renderToggle({ value: "AUTO", onChange: vi.fn() });

    expect(
      screen.getByRole("radio", { name: /renovación automática/i }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("radio", { name: /renovación manual/i }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with the clicked option's value", () => {
    const onChange = vi.fn();
    renderToggle({ value: "AUTO", onChange });

    fireEvent.click(screen.getByRole("radio", { name: /renovación manual/i }));

    expect(onChange).toHaveBeenCalledWith("MANUAL");
  });
});
