/**
 * lib/crypto.ts
 *
 * AES-256-GCM encryption for sensitive fields stored in the database
 * (2FA TOTP secrets, backup codes, etc.).
 *
 * Requires the environment variable:
 *   ENCRYPTION_KEY  — a 64-char hex string (32 bytes / 256 bits)
 *
 * Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;   // GCM recommended IV size
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY env var is missing or invalid. " +
        "Set it to a 64-char hex string (32 random bytes)."
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string: <iv>:<ciphertext>:<authTag>
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    encrypted.toString("base64"),
    authTag.toString("base64"),
  ].join(":");
}

/**
 * Decrypt a string previously returned by `encrypt()`.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");

  const [ivB64, encB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Hash a value using HMAC-SHA-256 (for backup codes, CSRF tokens, etc.)
 * Not reversible – use `encrypt/decrypt` when you need to read the value back.
 */
export function hmacHash(value: string, secret = process.env.NEXTAUTH_SECRET ?? ""): string {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}
