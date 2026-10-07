import { formatLongDate, formatMoney } from "./text";
import type { ContractType, Job, JobStatus, SourceId, WorkPattern } from "./types";

export const STATUS_LABEL: Record<JobStatus, string> = {
  new: "New",
  low_fit: "Low fit",
  shortlisted: "Shortlisted",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  skipped: "Skipped",
  filtered: "Filtered",
  expired: "Expired",
};

export const PIPELINE_TABS: JobStatus[] = [
  "new",
  "shortlisted",
  "applied",
  "interview",
  "offer",
  "rejected",
  "skipped",
  "low_fit",
  "filtered",
];

export function salaryLabel(job: Pick<Job, "salaryMin" | "salaryMax" | "salaryPeriod" | "currency">): string {
  if (job.salaryMin == null && job.salaryMax == null) return "Salary not stated";
  const min = job.salaryMin ?? job.salaryMax;
  const max = job.salaryMax ?? job.salaryMin;
  if (min == null || max == null) return "Salary not stated";
  if (min === max) return formatMoney(min, job.currency, job.salaryPeriod);
  const left = formatMoney(min, job.currency, null);
  const right = formatMoney(max, job.currency, job.salaryPeriod);
  return `${left} to ${right}`;
}

export function patternLabel(pattern: WorkPattern, hybridDays: number | null): string {
  if (pattern === "hybrid") return hybridDays ? `Hybrid, ${hybridDays} days on site` : "Hybrid";
  if (pattern === "remote") return "Remote";
  return "On site";
}

export function contractLabel(type: ContractType): string {
  if (type === "fixed-term") return "Fixed term";
  if (type === "part-time") return "Part time";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function sourceLabel(source: SourceId, publisher: string | null): string {
  if (source === "reed") return "Reed.co.uk";
  if (publisher) return publisher;
  if (source === "linkedin") return "LinkedIn";
  return "Google Jobs";
}

export function postedLabel(iso: string): string {
  const date = new Date(iso);
  const today = formatLongDate(new Date());
  const that = formatLongDate(date);
  if (today === that) return "Today";
  return that;
}

export function runSummary(run: { finishedAt: string | null; totals: { fetched: number; new: number; worthALook: number } } | null): string {
  if (!run?.finishedAt) return "No run yet.";
  const clock = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/London",
  }).format(new Date(run.finishedAt));
  return `Run completed ${clock}, ${run.totals.fetched} fetched, ${run.totals.new} new, ${run.totals.worthALook} worth a look.`;
}
