// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AwaitingConfirmationPanel } from "./AwaitingConfirmationPanel";

afterEach(() => {
  cleanup();
});

describe("AwaitingConfirmationPanel", () => {
  it("shows a waiting-for-confirmation message", () => {
    render(
      <AwaitingConfirmationPanel onRefresh={vi.fn()} isRefreshing={false} />,
    );

    expect(screen.getByText(/confirm/i)).toBeInTheDocument();
  });

  it("calls onRefresh when the check-again button is clicked", () => {
    const onRefresh = vi.fn();
    render(
      <AwaitingConfirmationPanel onRefresh={onRefresh} isRefreshing={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /check again/i }));

    expect(onRefresh).toHaveBeenCalled();
  });

  it("disables the check-again button while refreshing", () => {
    render(
      <AwaitingConfirmationPanel onRefresh={vi.fn()} isRefreshing={true} />,
    );

    expect(screen.getByRole("button", { name: /check again/i })).toBeDisabled();
  });

  it("shows a manual-close fallback message when an external checkout tab was opened", () => {
    render(
      <AwaitingConfirmationPanel
        onRefresh={vi.fn()}
        isRefreshing={false}
        openedExternalTab
      />,
    );

    expect(screen.getByText(/close.*mercado pago.*tab/i)).toBeInTheDocument();
  });

  it("omits the manual-close fallback message when no external tab was opened", () => {
    render(
      <AwaitingConfirmationPanel onRefresh={vi.fn()} isRefreshing={false} />,
    );

    expect(screen.queryByText(/mercado pago.*tab/i)).not.toBeInTheDocument();
  });
});
