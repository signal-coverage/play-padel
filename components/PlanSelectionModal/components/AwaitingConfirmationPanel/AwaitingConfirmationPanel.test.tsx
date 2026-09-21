// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { AwaitingConfirmationPanel } from "./AwaitingConfirmationPanel";

afterEach(() => {
  cleanup();
});

function renderPanel(
  props: React.ComponentProps<typeof AwaitingConfirmationPanel>,
) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <AwaitingConfirmationPanel {...props} />
    </NextIntlClientProvider>,
  );
}

describe("AwaitingConfirmationPanel", () => {
  it("shows a waiting-for-confirmation message", () => {
    renderPanel({ onRefresh: vi.fn(), isRefreshing: false });

    expect(screen.getByText(/confirmando/i)).toBeInTheDocument();
  });

  it("calls onRefresh when the check-again button is clicked", () => {
    const onRefresh = vi.fn();
    renderPanel({ onRefresh, isRefreshing: false });

    fireEvent.click(
      screen.getByRole("button", { name: /volver a comprobar/i }),
    );

    expect(onRefresh).toHaveBeenCalled();
  });

  it("disables the check-again button while refreshing", () => {
    renderPanel({ onRefresh: vi.fn(), isRefreshing: true });

    expect(
      screen.getByRole("button", { name: /volver a comprobar/i }),
    ).toBeDisabled();
  });

  it("shows a manual-close fallback message when an external checkout tab was opened", () => {
    renderPanel({
      onRefresh: vi.fn(),
      isRefreshing: false,
      openedExternalTab: true,
    });

    expect(
      screen.getByText(/cerrar.*pestaña.*mercado pago/i),
    ).toBeInTheDocument();
  });

  it("omits the manual-close fallback message when no external tab was opened", () => {
    renderPanel({ onRefresh: vi.fn(), isRefreshing: false });

    expect(screen.queryByText(/pestaña/i)).not.toBeInTheDocument();
  });
});
