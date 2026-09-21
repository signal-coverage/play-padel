import { afterEach, describe, expect, it, vi } from "vitest";
import es from "@/messages/es.json";
import { resolveCardErrorMessage, resolvePublicKey } from "./utils";

// Fake translator backed by the real es.json copy — a plain lookup, since
// this util isn't a component and can't call useTranslations() itself (see
// CardTokenForm.tsx's own useTranslations("CardTokenForm") call for the
// real caller).
const t = (key: string) => (es.CardTokenForm as Record<string, string>)[key];

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
      resolveCardErrorMessage(
        {
          cause: "missing_payment_information",
          message: "no_payment_method_for_provided_bin",
        },
        t,
      ),
    ).toBe(
      "No reconocemos esa tarjeta. Revisá el número, o probá con otra tarjeta.",
    );
  });

  it("passes through an already human-readable message unchanged", () => {
    expect(
      resolveCardErrorMessage(
        {
          cause: "invalid_card_number",
          message: "invalid card number",
        },
        t,
      ),
    ).toBe("invalid card number");
  });

  it("falls back to a generic message when neither cause nor message is present", () => {
    expect(resolveCardErrorMessage({}, t)).toBe(
      "No pudimos validar tu tarjeta. Intentá de nuevo.",
    );
  });
});
