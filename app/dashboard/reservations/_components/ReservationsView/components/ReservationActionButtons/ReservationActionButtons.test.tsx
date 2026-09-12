// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ReservationActionButtons } from "./ReservationActionButtons";

afterEach(() => cleanup());

describe("ReservationActionButtons", () => {
  it("renders the standard Complete/No-show/Cancel trio without a Confirm transfer button by default", () => {
    render(
      <ReservationActionButtons
        reservationId="res-1"
        onAction={vi.fn()}
        isPending={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Complete" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm transfer/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a Confirm transfer button when showConfirmTransfer is true, and calls onAction with 'confirmTransfer'", () => {
    const onAction = vi.fn();
    render(
      <ReservationActionButtons
        reservationId="res-1"
        onAction={onAction}
        isPending={false}
        showConfirmTransfer
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm transfer/i }));
    expect(onAction).toHaveBeenCalledWith("res-1", "confirmTransfer");
  });
});
