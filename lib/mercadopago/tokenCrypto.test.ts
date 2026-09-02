import { describe, it, expect, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import { encryptToken, decryptToken } from "@/lib/mercadopago/tokenCrypto";

// 32 raw bytes, base64-encoded — matches the AES-256-GCM key length required
// by tokenCrypto.ts (`openssl rand -base64 32` produces the same shape).
const TEST_KEY = crypto.randomBytes(32).toString("base64");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("encryptToken / decryptToken", () => {
  it("round-trips plaintext through encrypt then decrypt", () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", TEST_KEY);
    const plaintext = "APP_USR-1234567890-access-token";

    const ciphertext = encryptToken(plaintext);
    const result = decryptToken(ciphertext);

    expect(result).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext on repeated calls (random IV)", () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", TEST_KEY);
    const plaintext = "same-plaintext-value";

    const first = encryptToken(plaintext);
    const second = encryptToken(plaintext);

    expect(first).not.toBe(second);
    expect(decryptToken(first)).toBe(plaintext);
    expect(decryptToken(second)).toBe(plaintext);
  });

  it("throws when the ciphertext has been tampered with (auth tag mismatch)", () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", TEST_KEY);
    const ciphertext = encryptToken("some-refresh-token");

    // Flip a character in the middle of the base64 payload to corrupt either
    // the auth tag or the ciphertext bytes without changing its length.
    const bytes = Buffer.from(ciphertext, "base64");
    bytes[bytes.length - 1] = bytes[bytes.length - 1] ^ 0xff;
    const tampered = bytes.toString("base64");

    expect(() => decryptToken(tampered)).toThrow();
  });

  it("throws when decrypting with the wrong key", () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", TEST_KEY);
    const ciphertext = encryptToken("secret-value");

    vi.stubEnv(
      "MERCADOPAGO_TOKEN_ENCRYPTION_KEY",
      crypto.randomBytes(32).toString("base64"),
    );

    expect(() => decryptToken(ciphertext)).toThrow();
  });

  it("throws when MERCADOPAGO_TOKEN_ENCRYPTION_KEY is not configured", () => {
    vi.stubEnv("MERCADOPAGO_TOKEN_ENCRYPTION_KEY", "");

    expect(() => encryptToken("value")).toThrow(
      "MERCADOPAGO_TOKEN_ENCRYPTION_KEY is not set",
    );
  });

  it("throws when MERCADOPAGO_TOKEN_ENCRYPTION_KEY is not 32 bytes once decoded", () => {
    vi.stubEnv(
      "MERCADOPAGO_TOKEN_ENCRYPTION_KEY",
      crypto.randomBytes(16).toString("base64"),
    );

    expect(() => encryptToken("value")).toThrow();
  });
});
