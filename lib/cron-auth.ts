import { timingSafeEqual } from "crypto";

export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET || "";
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const left = Buffer.from(token);
  const right = Buffer.from(secret);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function redactSecrets(value: string): string {
  let text = value;
  for (const [key, secret] of Object.entries(process.env)) {
    if (!secret || secret.length < 8) continue;
    if (!/TOKEN|KEY|SECRET|PASSWORD/i.test(key)) continue;
    text = text.split(secret).join("");
  }
  return text.slice(0, 300);
}
