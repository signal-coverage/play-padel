import { describe, it, expect, vi, afterEach } from "vitest";
import crypto from "node:crypto";
import { verifyMercadoPagoSignature } from "@/lib/mercadopago/webhookSignature";

/**
 * Builds a genuinely valid `x-signature` header the same way
 * `mercadopago`'s WebhookSignatureValidator computes it internally
 * (node_modules/mercadopago/dist/utils/webhook/index.js):
 *
 *   manifest = "id:{dataId};request-id:{requestId};ts:{ts};"
 *   hash     = HMAC-SHA256(secret, manifest) as hex
 *   header   = "ts={ts},v1={hash}"
 *
 * This lets the "valid signature" test exercise a real positive case rather
 * than only asserting on the invalid/missing-input paths.
 */
function buildValidXSignature(
  secret: string,
  dataId: string,
  requestId: string,
  ts: string,
): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hash = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");
  return `ts=${ts},v1=${hash}`;
}

const SECRET = "test-webhook-secret";
const DATA_ID = "123456789";
const REQUEST_ID = "req-abc-123";

function currentTs(): string {
  return Math.floor(Date.now() / 1000).toString();
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyMercadoPagoSignature", () => {
  it("returns true for a genuinely valid signature", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
    const xSignature = buildValidXSignature(
      SECRET,
      DATA_ID,
      REQUEST_ID,
      currentTs(),
    );

    const result = verifyMercadoPagoSignature({
      xSignature,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
    });

    expect(result).toBe(true);
  });

  it("returns false for a tampered signature (hash does not match the payload)", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
    const valid = buildValidXSignature(
      SECRET,
      DATA_ID,
      REQUEST_ID,
      currentTs(),
    );
    const tampered = valid.replace(/v1=[0-9a-f]+/, "v1=deadbeef");

    const result = verifyMercadoPagoSignature({
      xSignature: tampered,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
    });

    expect(result).toBe(false);
  });

  it("returns false when the signature was computed with a different secret", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
    const xSignature = buildValidXSignature(
      "a-completely-different-secret",
      DATA_ID,
      REQUEST_ID,
      currentTs(),
    );

    const result = verifyMercadoPagoSignature({
      xSignature,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
    });

    expect(result).toBe(false);
  });

  it("returns false without throwing when the webhook secret is not configured", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
    const xSignature = buildValidXSignature(
      SECRET,
      DATA_ID,
      REQUEST_ID,
      currentTs(),
    );

    let result: boolean | undefined;
    expect(() => {
      result = verifyMercadoPagoSignature({
        xSignature,
        xRequestId: REQUEST_ID,
        dataId: DATA_ID,
      });
    }).not.toThrow();
    expect(result).toBe(false);
  });

  it("returns false without throwing when xSignature is missing", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);

    let result: boolean | undefined;
    expect(() => {
      result = verifyMercadoPagoSignature({
        xSignature: null,
        xRequestId: REQUEST_ID,
        dataId: DATA_ID,
      });
    }).not.toThrow();
    expect(result).toBe(false);
  });

  it("returns false without throwing when xRequestId is missing", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
    const xSignature = buildValidXSignature(
      SECRET,
      DATA_ID,
      REQUEST_ID,
      currentTs(),
    );

    let result: boolean | undefined;
    expect(() => {
      result = verifyMercadoPagoSignature({
        xSignature,
        xRequestId: null,
        dataId: DATA_ID,
      });
    }).not.toThrow();
    expect(result).toBe(false);
  });

  it("returns false without throwing when dataId is missing", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
    const xSignature = buildValidXSignature(
      SECRET,
      DATA_ID,
      REQUEST_ID,
      currentTs(),
    );

    let result: boolean | undefined;
    expect(() => {
      result = verifyMercadoPagoSignature({
        xSignature,
        xRequestId: REQUEST_ID,
        dataId: null,
      });
    }).not.toThrow();
    expect(result).toBe(false);
  });

  // A second webhook (e.g. the membership subscription webhook, registered
  // as its own notification URL in the MP DevPanel) gets its OWN signing
  // secret from Mercado Pago, distinct from the reservation webhook's
  // MERCADOPAGO_WEBHOOK_SECRET. Rather than duplicating the HMAC
  // verification algorithm in a second module, an optional `secret`
  // override lets any caller supply a different env-sourced secret while
  // every existing call site (no override passed) keeps reading
  // MERCADOPAGO_WEBHOOK_SECRET exactly as before.
  it("validates against an explicit secret override instead of MERCADOPAGO_WEBHOOK_SECRET when provided", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
    const otherSecret = "membership-webhook-secret";
    const xSignature = buildValidXSignature(
      otherSecret,
      DATA_ID,
      REQUEST_ID,
      currentTs(),
    );

    const result = verifyMercadoPagoSignature({
      xSignature,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: otherSecret,
    });

    expect(result).toBe(true);
  });

  it("rejects a signature computed with MERCADOPAGO_WEBHOOK_SECRET when a different secret override is supplied", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
    const xSignature = buildValidXSignature(
      SECRET,
      DATA_ID,
      REQUEST_ID,
      currentTs(),
    );

    const result = verifyMercadoPagoSignature({
      xSignature,
      xRequestId: REQUEST_ID,
      dataId: DATA_ID,
      secret: "membership-webhook-secret",
    });

    expect(result).toBe(false);
  });

  it("returns false without throwing when the secret override is an empty string and MERCADOPAGO_WEBHOOK_SECRET is unset", () => {
    vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
    const xSignature = buildValidXSignature(
      "irrelevant",
      DATA_ID,
      REQUEST_ID,
      currentTs(),
    );

    let result: boolean | undefined;
    expect(() => {
      result = verifyMercadoPagoSignature({
        xSignature,
        xRequestId: REQUEST_ID,
        dataId: DATA_ID,
        secret: "",
      });
    }).not.toThrow();
    expect(result).toBe(false);
  });
});
