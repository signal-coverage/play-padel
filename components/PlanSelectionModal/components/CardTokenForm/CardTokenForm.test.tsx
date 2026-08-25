// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const { initMercadoPagoMock } = vi.hoisted(() => ({
  initMercadoPagoMock: vi.fn(),
}));
// Minimal stand-in for the real Brick: exposes buttons that let each test
// simulate the SDK calling back into our wrapper's onSubmit/onError props,
// without ever mounting MP's real iframe-based UI (not renderable in jsdom).
vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: initMercadoPagoMock,
  CardPayment: (props: {
    initialization: { amount: number; payer?: { email?: string } };
    onSubmit: (formData: unknown) => Promise<void>;
    onError?: (param: { message?: string }) => void;
  }) => (
    <div data-testid="mock-card-payment-brick">
      <span data-testid="brick-amount">{props.initialization.amount}</span>
      <span data-testid="brick-email">
        {props.initialization.payer?.email ?? ""}
      </span>
      <button
        type="button"
        onClick={() =>
          props.onSubmit({
            token: "tok_abc123",
            issuer_id: "1",
            payment_method_id: "visa",
            transaction_amount: props.initialization.amount,
            installments: 1,
            payer: { email: props.initialization.payer?.email },
          })
        }
      >
        Simulate submit
      </button>
      <button
        type="button"
        onClick={() => props.onError?.({ message: "invalid card number" })}
      >
        Simulate brick error
      </button>
    </div>
  ),
}));

import { CardTokenForm } from "./CardTokenForm";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  initMercadoPagoMock.mockClear();
  vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "TEST-public-key");
});

describe("CardTokenForm", () => {
  it("initializes Mercado Pago with the configured public key", () => {
    render(
      <CardTokenForm amount={30000} onTokenReady={vi.fn()} onError={vi.fn()} />,
    );

    expect(initMercadoPagoMock).toHaveBeenCalledWith(
      "TEST-public-key",
      expect.objectContaining({ locale: expect.any(String) }),
    );
  });

  it("passes amount and payerEmail through to the Brick's initialization", () => {
    render(
      <CardTokenForm
        amount={50000}
        payerEmail="owner@club.com"
        onTokenReady={vi.fn()}
        onError={vi.fn()}
      />,
    );

    expect(screen.getByTestId("brick-amount")).toHaveTextContent("50000");
    expect(screen.getByTestId("brick-email")).toHaveTextContent(
      "owner@club.com",
    );
  });

  it("calls onTokenReady with the token from the Brick's onSubmit", () => {
    const onTokenReady = vi.fn();
    render(
      <CardTokenForm
        amount={30000}
        onTokenReady={onTokenReady}
        onError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Simulate submit" }));

    expect(onTokenReady).toHaveBeenCalledWith({ cardTokenId: "tok_abc123" });
  });

  it("calls onError with the Brick's error message", () => {
    const onError = vi.fn();
    render(
      <CardTokenForm amount={30000} onTokenReady={vi.fn()} onError={onError} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Simulate brick error" }),
    );

    expect(onError).toHaveBeenCalledWith("invalid card number");
  });

  it("shows a configuration error and never renders the Brick when the public key is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "");
    const onError = vi.fn();

    render(
      <CardTokenForm amount={30000} onTokenReady={vi.fn()} onError={onError} />,
    );

    expect(
      screen.queryByTestId("mock-card-payment-brick"),
    ).not.toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining("not configured"),
    );
  });
});
