// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
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

function renderRow(props: React.ComponentProps<typeof ReservationRow>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ReservationRow {...props} />
    </NextIntlClientProvider>,
  );
}

describe("ReservationRow ticket actions", () => {
  it("renders preview and download ticket buttons for a CONFIRMED reservation", () => {
    renderRow({ reservation: makeReservation(), onCancel: vi.fn() });

    expect(
      screen.getByRole("link", { name: /vista previa del ticket/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /descargar ticket/i }),
    ).toBeInTheDocument();
  });

  it("does not render ticket buttons for a non-confirmed reservation", () => {
    renderRow({
      reservation: makeReservation({ status: "SCHEDULED" }),
      onCancel: vi.fn(),
    });

    expect(
      screen.queryByRole("link", { name: /vista previa del ticket/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /descargar ticket/i }),
    ).not.toBeInTheDocument();
  });

  it("links the download button to the ticket route without a preview param, using the download attribute", () => {
    renderRow({ reservation: makeReservation(), onCancel: vi.fn() });

    const downloadLink = screen.getByRole("link", {
      name: /descargar ticket/i,
    });
    expect(downloadLink).toHaveAttribute(
      "href",
      "/api/player/reservations/res_1/ticket",
    );
    expect(downloadLink).toHaveAttribute("download");
    expect(downloadLink).not.toHaveAttribute("target");
  });

  it("links the preview button to the ticket route with ?preview=1, opening in a new tab", () => {
    renderRow({ reservation: makeReservation(), onCancel: vi.fn() });

    const previewLink = screen.getByRole("link", {
      name: /vista previa del ticket/i,
    });
    expect(previewLink).toHaveAttribute(
      "href",
      "/api/player/reservations/res_1/ticket?preview=1",
    );
    expect(previewLink).toHaveAttribute("target", "_blank");
  });

  it("leaves the existing receipt button behavior unchanged when hasReceipt is true", () => {
    renderRow({
      reservation: makeReservation({ hasReceipt: true }),
      onCancel: vi.fn(),
    });

    const receiptLink = screen.getByRole("link", {
      name: /descargar comprobante/i,
    });
    expect(receiptLink).toHaveAttribute(
      "href",
      "/api/player/reservations/res_1/receipt",
    );
    expect(receiptLink).toHaveAttribute("download");
  });

  it("does not render the receipt button when hasReceipt is false", () => {
    renderRow({
      reservation: makeReservation({ hasReceipt: false }),
      onCancel: vi.fn(),
    });

    expect(
      screen.queryByRole("link", { name: /descargar comprobante/i }),
    ).not.toBeInTheDocument();
  });

  it("leaves the existing cancel button behavior unchanged", () => {
    const onCancel = vi.fn();
    renderRow({
      reservation: makeReservation({ canSelfCancel: true }),
      onCancel,
    });

    expect(
      screen.getByRole("button", { name: /cancelar reserva/i }),
    ).toBeInTheDocument();
  });

  it("does not render the cancel button when canSelfCancel is false", () => {
    renderRow({
      reservation: makeReservation({ canSelfCancel: false }),
      onCancel: vi.fn(),
    });

    expect(
      screen.queryByRole("button", { name: /cancelar reserva/i }),
    ).not.toBeInTheDocument();
  });
});
