// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { ReservationActionButtons } from "./ReservationActionButtons";

afterEach(() => cleanup());

function renderButtons(
  props: React.ComponentProps<typeof ReservationActionButtons>,
) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ReservationActionButtons {...props} />
    </NextIntlClientProvider>,
  );
}

describe("ReservationActionButtons", () => {
  it("renders the standard Complete/No-show/Cancel trio without a Confirm transfer button by default", () => {
    renderButtons({
      reservationId: "res-1",
      onAction: vi.fn(),
      isPending: false,
    });
    expect(
      screen.getByRole("button", { name: "Complete" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm transfer/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a Confirm transfer button when showConfirmTransfer is true, and calls onAction with 'confirmTransfer'", () => {
    const onAction = vi.fn();
    renderButtons({
      reservationId: "res-1",
      onAction,
      isPending: false,
      showConfirmTransfer: true,
    });
    fireEvent.click(screen.getByRole("button", { name: /confirm transfer/i }));
    expect(onAction).toHaveBeenCalledWith("res-1", "confirmTransfer");
  });
});
