import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCardErrorMessage, resolvePublicKey } from "./utils";

describe("resolvePublicKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the configured public key", () => {
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", "TEST-public-key");
    expect(resolvePublicKey()).toBe("TEST-public-key");
  });

  it("returns null when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY", undefined);
    expect(resolvePublicKey()).toBeNull();
  });
});

describe("resolveCardErrorMessage", () => {
  it("maps a known raw MP message code to friendly copy", () => {
    expect(
      resolveCardErrorMessage({
        cause: "missing_payment_information",
        message: "no_payment_method_for_provided_bin",
      }),
    ).toBe(
      "We don't recognize that card. Double-check the number, or try a different card.",
    );
  });

  it("passes through an already human-readable message unchanged", () => {
    expect(
      resolveCardErrorMessage({
        cause: "invalid_card_number",
        message: "invalid card number",
      }),
    ).toBe("invalid card number");
  });

  it("falls back to a generic message when neither cause nor message is present", () => {
    expect(resolveCardErrorMessage({})).toBe(
      "We couldn't validate your card. Try again.",
    );
  });
});
