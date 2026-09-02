// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CardCollectionPanel } from "./CardCollectionPanel";

afterEach(() => {
  cleanup();
});

function renderPanel(
  overrides: Partial<Parameters<typeof CardCollectionPanel>[0]> = {},
) {
  const props = {
    payerEmail: "",
    onPayerEmailChange: vi.fn(),
    ...overrides,
  };
  render(<CardCollectionPanel {...props} />);
  return props;
}

describe("CardCollectionPanel", () => {
  it("starts with an editable, empty email and Verify disabled", () => {
    renderPanel({ payerEmail: "" });

    expect(screen.getByLabelText(/email/i)).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^verify$/i })).toBeDisabled();
  });

  it("pre-fills the draft with defaultEmail, editable and not yet verified", () => {
    const props = renderPanel({
      payerEmail: "",
      defaultEmail: "owner@club.com",
    });

    expect(screen.getByLabelText(/email/i)).toHaveValue("owner@club.com");
    expect(screen.getByLabelText(/email/i)).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));
    expect(props.onPayerEmailChange).toHaveBeenCalledWith("owner@club.com");
  });

  it("lets the owner overwrite the pre-filled defaultEmail before verifying", () => {
    const props = renderPanel({
      payerEmail: "",
      defaultEmail: "owner@club.com",
    });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "billing@club.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));

    expect(props.onPayerEmailChange).toHaveBeenCalledWith("billing@club.com");
  });

  it("does not call onPayerEmailChange while typing — only Verify commits it", () => {
    const props = renderPanel({ payerEmail: "" });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "a@b.com" },
    });
    expect(props.onPayerEmailChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^verify$/i }));
    expect(props.onPayerEmailChange).toHaveBeenCalledWith("a@b.com");
  });

  it("disables Verify for an invalid email", () => {
    renderPanel({ payerEmail: "" });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "not-an-email" },
    });

    expect(screen.getByRole("button", { name: /^verify$/i })).toBeDisabled();
  });

  it("commits the email on Enter, same as clicking Verify", () => {
    const props = renderPanel({ payerEmail: "" });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "a@b.com" },
    });
    fireEvent.keyDown(screen.getByLabelText(/email/i), { key: "Enter" });

    expect(props.onPayerEmailChange).toHaveBeenCalledWith("a@b.com");
  });

  it("locks the input once a payer email is verified, and shows Change email", () => {
    renderPanel({ payerEmail: "owner@club.com" });

    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/email/i)).toHaveValue("owner@club.com");
    expect(
      screen.getByRole("button", { name: /change email/i }),
    ).toBeInTheDocument();
  });

  it("clears the verified email when Change email is clicked", () => {
    const props = renderPanel({ payerEmail: "owner@club.com" });

    fireEvent.click(screen.getByRole("button", { name: /change email/i }));

    expect(props.onPayerEmailChange).toHaveBeenCalledWith("");
  });
});
