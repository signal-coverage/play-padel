// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const { initMercadoPagoMock, receivedBrickProps } = vi.hoisted(() => ({
  initMercadoPagoMock: vi.fn(),
  // Every render's `initialization`/`onSubmit`/`onError` object identity,
  // in order — lets tests assert the real Brick's own `useEffect` (whose
  // deps are these exact references, see CardTokenForm.tsx) wouldn't
  // re-fire across an unrelated parent re-render.
  receivedBrickProps: [] as Array<{
    initialization: unknown;
    onSubmit: unknown;
    onError: unknown;
  }>,
}));
// Minimal stand-in for the real Brick: exposes buttons that let each test
// simulate the SDK calling back into our wrapper's onSubmit/onError props,
// without ever mounting MP's real iframe-based UI (not renderable in jsdom).
vi.mock("@mercadopago/sdk-react", () => ({
  initMercadoPago: initMercadoPagoMock,
  CardPayment: (props: {
    initialization: { amount: number; payer?: { email?: string } };
    onSubmit: (formData: unknown) => Promise<void>;
    onError?: (param: { cause?: string; message?: string }) => void;
  }) => {
    receivedBrickProps.push({
      initialization: props.initialization,
      onSubmit: props.onSubmit,
      onError: props.onError,
    });
    return (
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
        <button
          type="button"
          onClick={() =>
            props.onError?.({
              cause: "missing_payment_information",
              message: "no_payment_method_for_provided_bin",
            })
          }
        >
          Simulate unrecognized BIN error
        </button>
      </div>
    );
  },
}));

import { CardTokenForm } from "./CardTokenForm";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  initMercadoPagoMock.mockClear();
  receivedBrickProps.length = 0;
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

  it("translates a raw, unmapped MP cause code into friendly copy", () => {
    const onError = vi.fn();
    render(
      <CardTokenForm amount={30000} onTokenReady={vi.fn()} onError={onError} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Simulate unrecognized BIN error" }),
    );

    expect(onError).toHaveBeenCalledWith(
      "We don't recognize that card. Double-check the number, or try a different card.",
    );
  });

  // Regression test for the exact bug reported live: entering an
  // unrecognized card BIN called `onError`, which re-rendered this
  // component, which (before memoizing these) handed the real
  // `@mercadopago/sdk-react` Brick brand-new `initialization`/`onSubmit`/
  // `onError` references — and the Brick's own `useEffect` depends on
  // those references, so it tore down and rebuilt the whole card form on
  // every keystroke-triggered error. An unrelated re-render (same amount,
  // payerEmail, and callback identities) must hand the Brick the SAME
  // references it already had.
  it("keeps the Brick's initialization/onSubmit/onError references stable across an unrelated re-render", () => {
    const onTokenReady = vi.fn();
    const onError = vi.fn();
    const { rerender } = render(
      <CardTokenForm
        amount={30000}
        payerEmail="owner@club.com"
        onTokenReady={onTokenReady}
        onError={onError}
      />,
    );

    expect(receivedBrickProps).toHaveLength(1);
    const first = receivedBrickProps[0];

    rerender(
      <CardTokenForm
        amount={30000}
        payerEmail="owner@club.com"
        onTokenReady={onTokenReady}
        onError={onError}
      />,
    );

    expect(receivedBrickProps).toHaveLength(2);
    const second = receivedBrickProps[1];
    expect(second.initialization).toBe(first.initialization);
    expect(second.onSubmit).toBe(first.onSubmit);
    expect(second.onError).toBe(first.onError);
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
