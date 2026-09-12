import { describe, it, expect } from "vitest";
import { needsTransferConfirmation } from "./utils";

const HOUR_MS = 60 * 60 * 1000;

describe("needsTransferConfirmation", () => {
  it("returns true for a SCHEDULED, unexpired TRANSFER hold", () => {
    expect(
      needsTransferConfirmation({
        status: "SCHEDULED",
        paymentMethod: "TRANSFER",
        paymentExpiresAt: new Date(Date.now() + HOUR_MS),
      }),
    ).toBe(true);
  });

  it("returns false when the status is not SCHEDULED", () => {
    expect(
      needsTransferConfirmation({
        status: "CONFIRMED",
        paymentMethod: "TRANSFER",
        paymentExpiresAt: new Date(Date.now() + HOUR_MS),
      }),
    ).toBe(false);
  });

  it("returns false when the payment method is not TRANSFER", () => {
    expect(
      needsTransferConfirmation({
        status: "SCHEDULED",
        paymentMethod: "MERCADOPAGO",
        paymentExpiresAt: new Date(Date.now() + HOUR_MS),
      }),
    ).toBe(false);
  });

  it("returns false when paymentExpiresAt is missing", () => {
    expect(
      needsTransferConfirmation({
        status: "SCHEDULED",
        paymentMethod: "TRANSFER",
        paymentExpiresAt: undefined,
      }),
    ).toBe(false);
  });

  it("returns false when paymentExpiresAt is in the past", () => {
    expect(
      needsTransferConfirmation({
        status: "SCHEDULED",
        paymentMethod: "TRANSFER",
        paymentExpiresAt: new Date(Date.now() - HOUR_MS),
      }),
    ).toBe(false);
  });
});
