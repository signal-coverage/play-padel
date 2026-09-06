// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ReservationRow } from "./ReservationRow";
import type { PlayerReservation } from "../../types";

function makeReservation(
  overrides: Partial<PlayerReservation> = {},
): PlayerReservation {
  return {
    id: "res_1",
    clubId: "club_1",
    userId: "user_1",
    userName: "Alex",
    courtId: "court_1",
    courtName: "Court 1",
    status: "CONFIRMED",
    scheduledStart: new Date("2026-09-01T18:00:00"),
    scheduledEnd: new Date("2026-09-01T19:00:00"),
    createdAt: new Date("2026-08-01T00:00:00"),
    updatedAt: new Date("2026-08-01T00:00:00"),
    canSelfCancel: true,
    hasReceipt: false,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("ReservationRow ticket actions", () => {
  it("renders preview and download ticket buttons for a CONFIRMED reservation", () => {
    render(
      <ReservationRow reservation={makeReservation()} onCancel={vi.fn()} />,
    );

    expect(
      screen.getByRole("link", { name: /preview ticket/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /download ticket/i }),
    ).toBeInTheDocument();
  });

  it("does not render ticket buttons for a non-confirmed reservation", () => {
    render(
      <ReservationRow
        reservation={makeReservation({ status: "SCHEDULED" })}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("link", { name: /preview ticket/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /download ticket/i }),
    ).not.toBeInTheDocument();
  });

  it("links the download button to the ticket route without a preview param, using the download attribute", () => {
    render(
      <ReservationRow reservation={makeReservation()} onCancel={vi.fn()} />,
    );

    const downloadLink = screen.getByRole("link", { name: /download ticket/i });
    expect(downloadLink).toHaveAttribute(
      "href",
      "/api/player/reservations/res_1/ticket",
    );
    expect(downloadLink).toHaveAttribute("download");
    expect(downloadLink).not.toHaveAttribute("target");
  });

  it("links the preview button to the ticket route with ?preview=1, opening in a new tab", () => {
    render(
      <ReservationRow reservation={makeReservation()} onCancel={vi.fn()} />,
    );

    const previewLink = screen.getByRole("link", { name: /preview ticket/i });
    expect(previewLink).toHaveAttribute(
      "href",
      "/api/player/reservations/res_1/ticket?preview=1",
    );
    expect(previewLink).toHaveAttribute("target", "_blank");
  });

  it("leaves the existing receipt button behavior unchanged when hasReceipt is true", () => {
    render(
      <ReservationRow
        reservation={makeReservation({ hasReceipt: true })}
        onCancel={vi.fn()}
      />,
    );

    const receiptLink = screen.getByRole("link", { name: /download receipt/i });
    expect(receiptLink).toHaveAttribute(
      "href",
      "/api/player/reservations/res_1/receipt",
    );
    expect(receiptLink).toHaveAttribute("download");
  });

  it("does not render the receipt button when hasReceipt is false", () => {
    render(
      <ReservationRow
        reservation={makeReservation({ hasReceipt: false })}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("link", { name: /download receipt/i }),
    ).not.toBeInTheDocument();
  });

  it("leaves the existing cancel button behavior unchanged", () => {
    const onCancel = vi.fn();
    render(
      <ReservationRow
        reservation={makeReservation({ canSelfCancel: true })}
        onCancel={onCancel}
      />,
    );

    expect(
      screen.getByRole("button", { name: /cancel reservation/i }),
    ).toBeInTheDocument();
  });

  it("does not render the cancel button when canSelfCancel is false", () => {
    render(
      <ReservationRow
        reservation={makeReservation({ canSelfCancel: false })}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /cancel reservation/i }),
    ).not.toBeInTheDocument();
  });
});
