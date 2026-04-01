/**
 * Strong symmetric encryption helpers.
 *
 * Current format on disk (v2, base64):
 *   v2:<16-byte-salt-hex>:<12-byte-iv-hex>:<16-byte-authTag-hex>:<ciphertext-hex>
 *
 * v2 uses AES-256-GCM with per-message random salt and IV.
 * Key derivation uses scrypt to harden low-entropy secrets.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const CURRENT_VERSION = "v2";
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH, SCRYPT_PARAMS);
}

function decryptGcm(data: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): string | null {
  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function encrypt(plaintext: string, secret: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const payload = [
    CURRENT_VERSION,
    salt.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");

  return Buffer.from(payload, "utf8").toString("base64");
}

export function decrypt(ciphertext: string, secret: string): string | null {
  try {
    const payload = Buffer.from(ciphertext, "base64").toString("utf8");
    const parts = payload.split(":");

    if (parts[0] !== CURRENT_VERSION || parts.length !== 5) return null;

    const [, saltHex, ivHex, authTagHex, dataHex] = parts;
    if (!saltHex || !ivHex || !authTagHex || !dataHex) return null;

    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const data = Buffer.from(dataHex, "hex");

    if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || authTag.length !== TAG_LENGTH) {
      return null;
    }

    const key = deriveKey(secret, salt);
    return decryptGcm(data, key, iv, authTag);
  } catch {
    return null;
  }
}

/** SHA-256 hash of a value with the AUTH_SECRET — matches TotalJS value.sha256(secret). */
export function hashWithSecret(value: string, secret: string): string {
  return createHash("sha256").update(value + secret).digest("hex");
}
