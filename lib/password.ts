import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt.16384.8.1.${salt.toString("hex")}.${hash.toString("hex")}`;
}

export function passwordsMatch(password: string, stored: string): boolean {
  const parts = stored.split(".");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  let actual: Buffer;
  try {
    actual = scryptSync(password, Buffer.from(parts[4], "hex"), KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 });
  } catch {
    return false;
  }
  const expected = Buffer.from(parts[5], "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(actual, expected);
}

export function sameText(left: string, right: string): boolean {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}
