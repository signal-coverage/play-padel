// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { ConfirmedPanel } from "./ConfirmedPanel";

afterEach(() => {
  cleanup();
});

function renderPanel(props: React.ComponentProps<typeof ConfirmedPanel>) {
  return render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <ConfirmedPanel {...props} />
    </NextIntlClientProvider>,
  );
}

describe("ConfirmedPanel", () => {
  it("shows the confirmed-state label", () => {
    renderPanel({ onClose: vi.fn() });

    expect(screen.getByText("Membresía activa")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    renderPanel({ onClose });

    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));

    expect(onClose).toHaveBeenCalled();
  });

  // Distinguishes "your trial has started, no payment needed yet" from
  // "your membership payment is confirmed" — most relevant for an ANNUAL
  // trial (started via `startTrial` with no Mercado Pago object at all, see
  // app/api/clubs/membership/route.ts), where saying "payment is confirmed"
  // would be actively misleading since no payment method was ever
  // authorized. Applies equally to MONTHLY's trial for consistency (that
  // one DOES have an authorized card, but the copy is about the STATUS —
  // TRIALING — not the cycle, so it stays uniform).
  it("shows trial-specific copy (not 'payment is confirmed') when isTrialing is true", () => {
    renderPanel({ onClose: vi.fn(), isTrialing: true });

    expect(screen.getByText("Prueba gratuita activa")).toBeInTheDocument();
    expect(
      screen.queryByText("El pago de tu membresía está confirmado."),
    ).not.toBeInTheDocument();
  });

  it("still shows the paid-confirmation copy when isTrialing is false/omitted", () => {
    renderPanel({ onClose: vi.fn(), isTrialing: false });

    expect(
      screen.getByText("El pago de tu membresía está confirmado."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Prueba gratuita activa"),
    ).not.toBeInTheDocument();
  });

  // Lets the owner change plan tier IMMEDIATELY while on a free trial —
  // both MONTHLY and ANNUAL trials qualify, since neither has been charged
  // yet (both cycles get only an authorized-but-uncharged preapproval).
  it("shows a Change Plan button when isTrialing and onChangePlan are both provided", () => {
    renderPanel({ onClose: vi.fn(), isTrialing: true, onChangePlan: vi.fn() });

    expect(
      screen.getByRole("button", { name: "Cambiar plan" }),
    ).toBeInTheDocument();
  });

  it("calls onChangePlan when the Change Plan button is clicked", () => {
    const onChangePlan = vi.fn();
    renderPanel({ onClose: vi.fn(), isTrialing: true, onChangePlan });

    fireEvent.click(screen.getByRole("button", { name: "Cambiar plan" }));

    expect(onChangePlan).toHaveBeenCalled();
  });

  it("does not show a Change Plan button when onChangePlan is omitted", () => {
    renderPanel({ onClose: vi.fn(), isTrialing: true });

    expect(
      screen.queryByRole("button", { name: "Cambiar plan" }),
    ).not.toBeInTheDocument();
  });

  it("does not show a Change Plan button when not trialing, even if onChangePlan is provided (already-paying clubs use requestPlanChange instead)", () => {
    renderPanel({ onClose: vi.fn(), onChangePlan: vi.fn() });

    expect(
      screen.queryByRole("button", { name: "Cambiar plan" }),
    ).not.toBeInTheDocument();
  });

  it("disables the Change Plan button and shows a loading label while isChangingPlan is true", () => {
    renderPanel({
      onClose: vi.fn(),
      isTrialing: true,
      onChangePlan: vi.fn(),
      isChangingPlan: true,
    });

    const button = screen.getByRole("button", { name: /cambiando de plan/i });
    expect(button).toBeDisabled();
  });
});
