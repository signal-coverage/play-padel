// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";

vi.mock("../CardTokenForm", () => ({
  CardTokenForm: (props: {
    payerEmail?: string;
    identification?: { type: string; number: string };
    onTokenReady: (result: { cardTokenId: string }) => void;
  }) => (
    <div data-testid="mock-card-token-form">
      <span data-testid="card-form-email">{props.payerEmail ?? ""}</span>
      <span data-testid="card-form-identification">
        {props.identification
          ? `${props.identification.type}:${props.identification.number}`
          : ""}
      </span>
      <button
        type="button"
        onClick={() => props.onTokenReady({ cardTokenId: "tok_xyz" })}
      >
        Simulate tokenize
      </button>
    </div>
  ),
}));

vi.mock("../AwaitingConfirmationPanel", () => ({
  AwaitingConfirmationPanel: (props: { onRefresh: () => void }) => (
    <div data-testid="mock-awaiting-confirmation">
      <button type="button" onClick={props.onRefresh}>
        Check again
      </button>
    </div>
  ),
}));

import { MembershipCheckoutDrawer } from "./MembershipCheckoutDrawer";

afterEach(() => {
  cleanup();
});

function renderDrawer(
  overrides: Partial<Parameters<typeof MembershipCheckoutDrawer>[0]> = {},
) {
  const props = {
    open: true,
    view: "collect-card" as const,
    amount: 30000,
    cycle: "monthly" as const,
    payerEmail: "",
    saveIdentification: false,
    onSaveIdentificationChange: vi.fn(),
    checkoutError: null,
    isSubmitting: false,
    isRefreshing: false,
    onOpenChange: vi.fn(),
    onPayerEmailChange: vi.fn(),
    onTokenReady: vi.fn(),
    onCardError: vi.fn(),
    onBack: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  };
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <MembershipCheckoutDrawer {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

describe("MembershipCheckoutDrawer", () => {
  it("shows the email step without the card form until verified", () => {
    renderDrawer({ payerEmail: "" });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.queryByTestId("mock-card-token-form"),
    ).not.toBeInTheDocument();
  });

  it("pre-fills the email step's draft with defaultEmail", () => {
    renderDrawer({ payerEmail: "", defaultEmail: "owner@club.com" });

    expect(screen.getByLabelText(/email/i)).toHaveValue("owner@club.com");
  });

  it("reveals the card form once the email is verified, prefilled", () => {
    renderDrawer({ payerEmail: "owner@club.com" });

    expect(screen.getByTestId("mock-card-token-form")).toBeInTheDocument();
    expect(screen.getByTestId("card-form-email")).toHaveTextContent(
      "owner@club.com",
    );
  });

  it("forwards the token from the card form to onTokenReady", () => {
    const props = renderDrawer({ payerEmail: "owner@club.com" });

    fireEvent.click(screen.getByRole("button", { name: "Simulate tokenize" }));

    expect(props.onTokenReady).toHaveBeenCalledWith({ cardTokenId: "tok_xyz" });
  });

  it("shows the checkout error next to the card form", () => {
    renderDrawer({
      payerEmail: "owner@club.com",
      checkoutError: "Card declined",
    });

    expect(screen.getByText("Card declined")).toBeInTheDocument();
  });

  it("does not show the save-identification checkbox when no identification is known", () => {
    renderDrawer({ payerEmail: "owner@club.com", identification: undefined });

    expect(
      screen.queryByText(/guardar este dato para futuros pagos/i),
    ).not.toBeInTheDocument();
  });

  it("shows the save-identification checkbox and threads identification through to CardTokenForm when identification is known", () => {
    renderDrawer({
      payerEmail: "owner@club.com",
      identification: { type: "CUIT", number: "30-12345678-9" },
    });

    expect(
      screen.getByText(/guardar este dato para futuros pagos/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("card-form-identification")).toHaveTextContent(
      "CUIT:30-12345678-9",
    );
  });

  it("calls onSaveIdentificationChange when the checkbox is toggled", () => {
    const props = renderDrawer({
      payerEmail: "owner@club.com",
      identification: { type: "CUIT", number: "30-12345678-9" },
      saveIdentification: true,
    });

    fireEvent.click(screen.getByRole("checkbox"));

    expect(props.onSaveIdentificationChange).toHaveBeenCalledWith(false);
  });

  it("calls onBack when Back is clicked on the email step", () => {
    const props = renderDrawer({ payerEmail: "" });

    fireEvent.click(screen.getByRole("button", { name: /atrás/i }));

    expect(props.onBack).toHaveBeenCalled();
  });

  // Back is contextual, same as a wizard's: on the card step it returns to
  // the email step instead of leaving the drawer entirely.
  it("returns to the email step, instead of exiting, when Back is clicked on the card step", () => {
    const props = renderDrawer({ payerEmail: "owner@club.com" });

    fireEvent.click(screen.getByRole("button", { name: /atrás/i }));

    expect(props.onPayerEmailChange).toHaveBeenCalledWith("");
    expect(props.onBack).not.toHaveBeenCalled();
  });

  it("shows the awaiting-confirmation view instead, with no Back button", () => {
    renderDrawer({ view: "awaiting-confirmation" });

    expect(
      screen.getByTestId("mock-awaiting-confirmation"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^atrás$/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onRefresh from the awaiting-confirmation view", () => {
    const props = renderDrawer({ view: "awaiting-confirmation" });

    fireEvent.click(screen.getByRole("button", { name: /check again/i }));

    expect(props.onRefresh).toHaveBeenCalled();
  });

  // Both billing cycles collect a card through this same drawer now — the
  // "/ month" vs "/ year" copy is the one piece of UI text that must track
  // which cycle the owner actually picked (see this component's own
  // `cycle` prop doc comment).
  it("shows '/ month' copy for a MONTHLY checkout", () => {
    renderDrawer({ cycle: "monthly" });

    expect(screen.getByText(/\/ mes/)).toBeInTheDocument();
    expect(screen.queryByText(/\/ año/)).not.toBeInTheDocument();
  });

  it("shows '/ year' copy for an ANNUAL checkout", () => {
    renderDrawer({ cycle: "annual" });

    expect(screen.getByText(/\/ año/)).toBeInTheDocument();
    expect(screen.queryByText(/\/ mes/)).not.toBeInTheDocument();
  });
});
