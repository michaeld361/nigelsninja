const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function loginAllowed(key: string, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) return true;
  return bucket.count < MAX_FAILURES;
}

export function noteLoginFailure(key: string, now = Date.now()) {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function noteLoginSuccess(key: string) {
  buckets.delete(key);
}

export function resetLoginLimits() {
  buckets.clear();
}
