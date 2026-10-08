import type { FitAssessment } from "./types";

type ReasonFit = Pick<FitAssessment, "score" | "summary" | "gaps" | "blockers">;

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** A stored explanation from the scoring pass. Missing text means the next run should write one. */
export function lowFitReason(fit: ReasonFit | null | undefined): string | null {
  if (!fit) return null;
  const summary = clean(fit.summary || "");
  const blockers = (fit.blockers || []).map(clean).filter(Boolean);
  const gaps = (fit.gaps || []).map(clean).filter(Boolean);
  if (!summary && !blockers.length && !gaps.length) return null;
  const parts = [`Score ${fit.score}.`];
  if (summary) parts.push(/[.!?]$/.test(summary) ? summary : `${summary}.`);
  if (blockers.length) parts.push(blockers.join(". "));
  if (gaps.length) parts.push(gaps.join(". "));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
