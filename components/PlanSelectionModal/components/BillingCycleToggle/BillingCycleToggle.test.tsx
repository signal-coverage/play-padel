// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { BillingCycleToggle } from "./BillingCycleToggle";

afterEach(() => {
  cleanup();
});

function renderToggle(props: React.ComponentProps<typeof BillingCycleToggle>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <BillingCycleToggle {...props} />
    </NextIntlClientProvider>,
  );
}

describe("BillingCycleToggle", () => {
  it("renders both options", () => {
    renderToggle({ value: "monthly", onChange: vi.fn() });

    expect(screen.getByRole("button", { name: "Mensual" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anual" })).toBeInTheDocument();
  });

  it("calls onChange with the clicked option's value", () => {
    const onChange = vi.fn();
    renderToggle({ value: "monthly", onChange });

    fireEvent.click(screen.getByRole("button", { name: "Anual" }));

    expect(onChange).toHaveBeenCalledWith("annual");
  });
});
