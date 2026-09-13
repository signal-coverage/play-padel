import { describe, it, expect } from "vitest";
import { hasPendingPaymentHold } from "./utils";
import type { PlayerReservation } from "./types";

function makeReservation(
  overrides: Partial<PlayerReservation> = {},
): PlayerReservation {
  return {
    id: "res_1",
    clubId: "club_1",
    userId: "user_1",
    userName: "Nico Sanchez",
    courtId: "court_1",
    courtName: "Court 1",
    status: "CONFIRMED",
    scheduledStart: new Date("2026-09-15T21:00:00Z"),
    scheduledEnd: new Date("2026-09-15T22:30:00Z"),
    createdAt: new Date("2026-09-12T00:00:00Z"),
    updatedAt: new Date("2026-09-12T00:00:00Z"),
    canSelfCancel: true,
    hasReceipt: false,
    ...overrides,
  };
}

describe("hasPendingPaymentHold", () => {
  it("returns false when there are no reservations yet (still loading)", () => {
    expect(hasPendingPaymentHold(undefined)).toBe(false);
  });

  it("returns false for an empty list", () => {
    expect(hasPendingPaymentHold([])).toBe(false);
  });

  it("returns false when every reservation is already settled (CONFIRMED)", () => {
    expect(hasPendingPaymentHold([makeReservation()])).toBe(false);
  });

  it("returns true for a SCHEDULED hold still inside its payment window", () => {
    const reservations = [
      makeReservation({
        status: "SCHEDULED",
        paymentMethod: "MERCADOPAGO",
        paymentExpiresAt: new Date(Date.now() + 60_000),
      }),
    ];
    expect(hasPendingPaymentHold(reservations)).toBe(true);
  });

  it("returns false once the hold's payment window has lapsed (nothing left to wait for)", () => {
    const reservations = [
      makeReservation({
        status: "SCHEDULED",
        paymentMethod: "MERCADOPAGO",
        paymentExpiresAt: new Date(Date.now() - 60_000),
      }),
    ];
    expect(hasPendingPaymentHold(reservations)).toBe(false);
  });

  it("returns false for a CANCELLED reservation, even one that still carries a past paymentExpiresAt", () => {
    const reservations = [
      makeReservation({
        status: "CANCELLED",
        paymentMethod: "MERCADOPAGO",
        paymentExpiresAt: new Date(Date.now() - 60_000),
      }),
    ];
    expect(hasPendingPaymentHold(reservations)).toBe(false);
  });
});
