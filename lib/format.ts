import { formatClock, formatLongDate, formatMoney } from "./text";
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

export function listingDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

export function jobMeta(job: Pick<Job, "location" | "demo" | "postedAt" | "salaryMin" | "salaryMax" | "salaryPeriod" | "currency">): string {
  return [job.location, listingDate(job.postedAt), job.demo ? "Sample" : "", salaryLabel(job)].filter(Boolean).join(" · ");
}

export function postedLabel(iso: string): string {
  const date = new Date(iso);
  const today = formatLongDate(new Date());
  const that = formatLongDate(date);
  if (today === that) return "Today";
  return that;
}

export function searchStatusLine(input: { finishedAt: string | null; searched: number; found: number } | null): string {
  if (!input?.finishedAt) return "No LinkedIn search yet.";
  const listings = input.searched === 1 ? "listing" : "listings";
  const roles = input.found === 1 ? "role" : "roles";
  return `${formatLongDate(input.finishedAt)} at ${formatClock(input.finishedAt)} London time. ${input.searched} ${listings} searched, ${input.found} ${roles} found.`;
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
