import type { Run } from "@/lib/types";

const WEEK = 24 * 7;

export function isSuccessfulRun(run: Pick<Run, "finishedAt" | "errors" | "counts">): boolean {
  return Boolean(run.finishedAt) && run.errors.length === 0 && !run.counts.linkedin?.error;
}

/** Hours since the last successful run, plus two hours, never more than seven days. A failed run does not move the window. */
export function lookbackSince(runs: Pick<Run, "finishedAt" | "errors" | "counts">[], now = Date.now()): number {
  const success = runs
    .filter(isSuccessfulRun)
    .sort((a, b) => (b.finishedAt || "").localeCompare(a.finishedAt || ""))[0];
  if (!success?.finishedAt) return WEEK;
  const elapsed = (now - new Date(success.finishedAt).getTime()) / (60 * 60 * 1000);
  if (!Number.isFinite(elapsed) || elapsed < 0) return WEEK;
  return Math.min(WEEK, Math.ceil(elapsed + 2));
}
