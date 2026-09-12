import { describe, it, expect } from "vitest";
import { PAYMENT_HOLD_MINUTES, BANK_TRANSFER_HOLD_MINUTES } from "./consts";

describe("reservation hold-duration constants", () => {
  it("keeps the Mercado Pago hold at 15 minutes", () => {
    expect(PAYMENT_HOLD_MINUTES).toBe(15);
  });

  it("sets the bank-transfer hold to 60 minutes", () => {
    expect(BANK_TRANSFER_HOLD_MINUTES).toBe(60);
  });
});
