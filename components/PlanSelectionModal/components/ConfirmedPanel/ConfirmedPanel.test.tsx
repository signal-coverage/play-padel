// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ConfirmedPanel } from "./ConfirmedPanel";

afterEach(() => {
  cleanup();
});

describe("ConfirmedPanel", () => {
  it("shows the confirmed-state label", () => {
    render(<ConfirmedPanel onClose={vi.fn()} />);

    expect(screen.getByText("Membership Active")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<ConfirmedPanel onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

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
    render(<ConfirmedPanel onClose={vi.fn()} isTrialing />);

    expect(screen.getByText("Free Trial Active")).toBeInTheDocument();
    expect(
      screen.queryByText("Your membership payment is confirmed."),
    ).not.toBeInTheDocument();
  });

  it("still shows the paid-confirmation copy when isTrialing is false/omitted", () => {
    render(<ConfirmedPanel onClose={vi.fn()} isTrialing={false} />);

    expect(
      screen.getByText("Your membership payment is confirmed."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Free Trial Active")).not.toBeInTheDocument();
  });

  // sdd-verify follow-up fix: an ANNUAL trial has no way to reach ACTIVE
  // without an explicit "Pay Now" action generating the one-time payment
  // link (see app/api/clubs/membership/route.ts's TRIALING "pay now"
  // branch) — otherwise it only ever ends via the cron sweep cancelling it.
  it("shows a Pay Now button when showPayNow is true", () => {
    render(<ConfirmedPanel onClose={vi.fn()} isTrialing showPayNow />);

    expect(screen.getByRole("button", { name: "Pay Now" })).toBeInTheDocument();
  });

  it("does not show a Pay Now button when showPayNow is false/omitted (e.g. a MONTHLY trial, which already has an authorized preapproval)", () => {
    render(<ConfirmedPanel onClose={vi.fn()} isTrialing />);

    expect(
      screen.queryByRole("button", { name: "Pay Now" }),
    ).not.toBeInTheDocument();
  });

  it("calls onPayNow when the Pay Now button is clicked", () => {
    const onPayNow = vi.fn();
    render(
      <ConfirmedPanel
        onClose={vi.fn()}
        isTrialing
        showPayNow
        onPayNow={onPayNow}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pay Now" }));

    expect(onPayNow).toHaveBeenCalled();
  });

  it("disables the Pay Now button and shows a loading label while isPayNowLoading is true", () => {
    render(
      <ConfirmedPanel
        onClose={vi.fn()}
        isTrialing
        showPayNow
        isPayNowLoading
      />,
    );

    const button = screen.getByRole("button", {
      name: "Generating payment link...",
    });
    expect(button).toBeDisabled();
  });

  it("shows payNowError when present", () => {
    render(
      <ConfirmedPanel
        onClose={vi.fn()}
        isTrialing
        showPayNow
        payNowError="Mercado Pago is unavailable right now."
      />,
    );

    expect(
      screen.getByText("Mercado Pago is unavailable right now."),
    ).toBeInTheDocument();
  });

  // Lets the owner change plan tier IMMEDIATELY while on a free trial —
  // both MONTHLY and ANNUAL trials qualify, since neither has been charged
  // yet. Independent of showPayNow (ANNUAL-only) — a MONTHLY trial gets
  // Change Plan but never Pay Now.
  it("shows a Change Plan button when isTrialing and onChangePlan are both provided", () => {
    render(
      <ConfirmedPanel onClose={vi.fn()} isTrialing onChangePlan={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: "Change Plan" }),
    ).toBeInTheDocument();
  });

  it("calls onChangePlan when the Change Plan button is clicked", () => {
    const onChangePlan = vi.fn();
    render(
      <ConfirmedPanel
        onClose={vi.fn()}
        isTrialing
        onChangePlan={onChangePlan}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change Plan" }));

    expect(onChangePlan).toHaveBeenCalled();
  });

  it("does not show a Change Plan button when onChangePlan is omitted", () => {
    render(<ConfirmedPanel onClose={vi.fn()} isTrialing />);

    expect(
      screen.queryByRole("button", { name: "Change Plan" }),
    ).not.toBeInTheDocument();
  });

  it("does not show a Change Plan button when not trialing, even if onChangePlan is provided (already-paying clubs use requestPlanChange instead)", () => {
    render(<ConfirmedPanel onClose={vi.fn()} onChangePlan={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Change Plan" }),
    ).not.toBeInTheDocument();
  });

  it("disables the Change Plan button and shows a loading label while isChangingPlan is true", () => {
    render(
      <ConfirmedPanel
        onClose={vi.fn()}
        isTrialing
        onChangePlan={vi.fn()}
        isChangingPlan
      />,
    );

    const button = screen.getByRole("button", { name: /changing plan/i });
    expect(button).toBeDisabled();
  });
});
