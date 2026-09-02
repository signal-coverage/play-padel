// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../CardTokenForm", () => ({
  CardTokenForm: (props: {
    payerEmail?: string;
    onTokenReady: (result: { cardTokenId: string }) => void;
  }) => (
    <div data-testid="mock-card-token-form">
      <span data-testid="card-form-email">{props.payerEmail ?? ""}</span>
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
    payerEmail: "",
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
  render(<MembershipCheckoutDrawer {...props} />);
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

  it("calls onBack when Back is clicked on the email step", () => {
    const props = renderDrawer({ payerEmail: "" });

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(props.onBack).toHaveBeenCalled();
  });

  // Back is contextual, same as a wizard's: on the card step it returns to
  // the email step instead of leaving the drawer entirely.
  it("returns to the email step, instead of exiting, when Back is clicked on the card step", () => {
    const props = renderDrawer({ payerEmail: "owner@club.com" });

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(props.onPayerEmailChange).toHaveBeenCalledWith("");
    expect(props.onBack).not.toHaveBeenCalled();
  });

  it("shows the awaiting-confirmation view instead, with no Back button", () => {
    renderDrawer({ view: "awaiting-confirmation" });

    expect(
      screen.getByTestId("mock-awaiting-confirmation"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^back$/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onRefresh from the awaiting-confirmation view", () => {
    const props = renderDrawer({ view: "awaiting-confirmation" });

    fireEvent.click(screen.getByRole("button", { name: /check again/i }));

    expect(props.onRefresh).toHaveBeenCalled();
  });
});
