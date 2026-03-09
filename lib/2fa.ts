/**
 * lib/2fa.ts
 *
 * TOTP-based 2FA — implemented with Node's built-in `crypto` module only.
 * No dependency on otplib at all, so there are zero version-mismatch issues.
 *
 * Fully compatible with Google Authenticator, Authy, and any RFC 6238 app.
 *
 * Only external dep: `qrcode` (for generating the QR PNG).
 *   npm install qrcode && npm install --save-dev @types/qrcode
 */

import crypto from "crypto";
import QRCode from "qrcode";
import { encrypt, decrypt, hmacHash } from "./crypto";

const APP_NAME = "AskMe Limited Payroll";
const BACKUP_CODE_COUNT = 8;
const TOTP_PERIOD = 30;       // seconds
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;        // accept 1 step before/after (clock skew tolerance)

// ─── Base32 helpers (RFC 4648) ────────────────────────────────────────────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Encode a Buffer to a base32 string (no padding). */
function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

/** Decode a base32 string to a Buffer (ignores padding). */
function base32Decode(input: string): Buffer {
  const str = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of str) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue; // skip unknown chars
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// ─── Core TOTP (RFC 6238 / HOTP RFC 4226) ────────────────────────────────────

function hotp(secret: Buffer, counter: number): string {
  // Counter as big-endian 8-byte buffer
  const buf = Buffer.alloc(8);
  // JS numbers are safe up to 2^53 — fine for TOTP counters
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

function totpCounter(forTime = Date.now()): number {
  return Math.floor(forTime / 1000 / TOTP_PERIOD);
}

// ─── Secret management ────────────────────────────────────────────────────────

/** Generate a cryptographically random 20-byte base32 TOTP secret. */
export function generateTotpSecret(): { secret: string; encryptedSecret: string } {
  const secret = base32Encode(crypto.randomBytes(20));
  return { secret, encryptedSecret: encrypt(secret) };
}

/** Decrypt and return the raw TOTP secret from its stored (encrypted) form. */
export function decryptTotpSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret);
}

// ─── QR code ─────────────────────────────────────────────────────────────────

/** Build a standard otpauth:// URI and return it as a base64 PNG data URL. */
export async function generateQrCodeDataUrl(email: string, secret: string): Promise<string> {
  const label = encodeURIComponent(`${APP_NAME}:${email}`);
  const issuer = encodeURIComponent(APP_NAME);
  const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
  return QRCode.toDataURL(uri, { width: 256, margin: 2 });
}

// ─── Verification ─────────────────────────────────────────────────────────────

/** Verify a 6-digit TOTP token against the plaintext base32 secret. */
export function verifyTotp(token: string, secret: string): boolean {
  try {
    const key = base32Decode(secret);
    const counter = totpCounter();
    for (let delta = -TOTP_WINDOW; delta <= TOTP_WINDOW; delta++) {
      if (hotp(key, counter + delta) === token) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Backup codes ─────────────────────────────────────────────────────────────

/**
 * Generate a fresh set of single-use backup codes.
 * `plainCodes`  → show to the user ONCE, never again.
 * `hashedCodes` → JSON-stringified HMAC-SHA-256 hashes to store in the DB.
 */
export function generateBackupCodes(): { plainCodes: string[]; hashedCodes: string } {
  const plainCodes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase()
  );
  return {
    plainCodes,
    hashedCodes: JSON.stringify(plainCodes.map((c) => hmacHash(c))),
  };
}

/**
 * Consume a backup code.
 * Returns the updated hashed-codes JSON on success, or null if invalid / already used.
 */
export function consumeBackupCode(code: string, storedHashedCodesJson: string): string | null {
  let stored: string[] = [];
  try { stored = JSON.parse(storedHashedCodesJson); } catch { return null; }

  const hash = hmacHash(code.toUpperCase());
  const idx = stored.indexOf(hash);
  if (idx === -1) return null;

  stored.splice(idx, 1);
  return JSON.stringify(stored);
}
