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

import { CardCollectionPanel } from "./CardCollectionPanel";

afterEach(() => {
  cleanup();
});

function renderPanel(
  overrides: Partial<Parameters<typeof CardCollectionPanel>[0]> = {},
) {
  const props = {
    amount: 30000,
    payerEmail: "",
    errorMessage: null,
    isSubmitting: false,
    onPayerEmailChange: vi.fn(),
    onTokenReady: vi.fn(),
    onCardError: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<CardCollectionPanel {...props} />);
  return props;
}

describe("CardCollectionPanel", () => {
  it("requires a payer email before showing the card form", () => {
    renderPanel({ payerEmail: "" });

    expect(
      screen.queryByTestId("mock-card-token-form"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/enter your email/i)).toBeInTheDocument();
  });

  it("shows the card form once a payer email is entered, prefilled", () => {
    renderPanel({ payerEmail: "owner@club.com" });

    expect(screen.getByTestId("mock-card-token-form")).toBeInTheDocument();
    expect(screen.getByTestId("card-form-email")).toHaveTextContent(
      "owner@club.com",
    );
  });

  it("calls onPayerEmailChange as the owner types", () => {
    const props = renderPanel({ payerEmail: "" });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "a@b.com" },
    });

    expect(props.onPayerEmailChange).toHaveBeenCalledWith("a@b.com");
  });

  it("forwards the token from the card form to onTokenReady", () => {
    const props = renderPanel({ payerEmail: "owner@club.com" });

    fireEvent.click(screen.getByRole("button", { name: "Simulate tokenize" }));

    expect(props.onTokenReady).toHaveBeenCalledWith({ cardTokenId: "tok_xyz" });
  });

  it("calls onBack when the back button is clicked", () => {
    const props = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(props.onBack).toHaveBeenCalled();
  });

  it("shows the error message when provided", () => {
    renderPanel({ errorMessage: "Card declined" });

    expect(screen.getByText("Card declined")).toBeInTheDocument();
  });
});
