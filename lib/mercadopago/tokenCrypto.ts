import crypto from "node:crypto";

// AES-256-GCM encryption at rest for club Mercado Pago OAuth tokens (see
// ClubMercadoPagoAccount.accessTokenEncrypted/refreshTokenEncrypted in
// prisma/schema.prisma). GCM's auth tag lets decryptToken detect any
// tampering with the stored ciphertext instead of silently returning garbage.
const ALGORITHM = "aes-256-gcm";
const KEY_BYTE_LENGTH = 32;
const IV_BYTE_LENGTH = 12; // 96-bit IV is the recommended/standard size for GCM.
const AUTH_TAG_BYTE_LENGTH = 16;

function getKey(): Buffer {
  const raw = process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("MERCADOPAGO_TOKEN_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTE_LENGTH) {
    throw new Error(
      `MERCADOPAGO_TOKEN_ENCRYPTION_KEY must decode to ${KEY_BYTE_LENGTH} bytes (got ${key.length}). Generate one with: openssl rand -base64 32`,
    );
  }
  return key;
}

// Output layout (all concatenated, then base64-encoded as a single string):
// [12-byte IV][16-byte auth tag][ciphertext bytes]
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTE_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptToken(ciphertext: string): string {
  const key = getKey();
  const payload = Buffer.from(ciphertext, "base64");

  if (payload.length < IV_BYTE_LENGTH + AUTH_TAG_BYTE_LENGTH) {
    throw new Error("Invalid encrypted token payload");
  }

  const iv = payload.subarray(0, IV_BYTE_LENGTH);
  const authTag = payload.subarray(
    IV_BYTE_LENGTH,
    IV_BYTE_LENGTH + AUTH_TAG_BYTE_LENGTH,
  );
  const encrypted = payload.subarray(IV_BYTE_LENGTH + AUTH_TAG_BYTE_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Throws (auth tag mismatch) if the ciphertext was tampered with or
  // decrypted with the wrong key — this is GCM's tamper detection.
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
