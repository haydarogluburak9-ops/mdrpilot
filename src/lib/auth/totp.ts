import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { BRAND_NAME } from "@/lib/brand";

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "dev-only-insecure-totp-key";
  return scryptSync(secret, "mdrpilot-totp-v1", 32);
}

export function encryptTotpSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptTotpSecret(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function generateTotpSecret(): string {
  return generateSecret();
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;
  const result = verifySync({
    secret,
    token: normalized,
    epochTolerance: 30,
  });
  return result.valid;
}

export async function buildTotpSetupPayload(email: string, secret: string) {
  const otpauthUrl = generateURI({
    issuer: BRAND_NAME,
    label: email,
    secret,
  });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
  return { qrDataUrl, manualKey: secret, otpauthUrl };
}
