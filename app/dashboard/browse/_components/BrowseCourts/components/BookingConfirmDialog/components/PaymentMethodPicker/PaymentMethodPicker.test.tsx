// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PaymentMethodPicker } from "./PaymentMethodPicker";

afterEach(() => cleanup());

describe("PaymentMethodPicker", () => {
  it("renders nothing when only one method is available", () => {
    const { container } = render(
      <PaymentMethodPicker
        availableMethods={["MERCADOPAGO"]}
        selectedMethod="MERCADOPAGO"
        onSelectMethod={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a choice between both methods and calls onSelectMethod on click", () => {
    const onSelectMethod = vi.fn();
    render(
      <PaymentMethodPicker
        availableMethods={["MERCADOPAGO", "TRANSFER"]}
        selectedMethod="MERCADOPAGO"
        onSelectMethod={onSelectMethod}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /bank transfer/i }));
    expect(onSelectMethod).toHaveBeenCalledWith("TRANSFER");
  });
});
