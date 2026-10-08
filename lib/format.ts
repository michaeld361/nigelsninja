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
  unscored: "Unscored",
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

export function listingDateShort(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function londonDayMonth(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" }).format(date);
}

export type ListingBlock = { kind: "head"; text: string } | { kind: "para"; text: string } | { kind: "list"; items: string[] };

export function listingBlocks(text: string): ListingBlock[] {
  const chunks = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const blocks: ListingBlock[] = [];
  const bullet = (line: string) => /^[-•*]\s+/.test(line) || /^\d+[.)]\s+/.test(line);
  const clean = (line: string) => line.replace(/^[-•*]\s+|^\d+[.)]\s+/, "");
  for (const chunk of chunks) {
    const lines = chunk
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length && lines.every(bullet)) {
      blocks.push({ kind: "list", items: lines.map(clean) });
      continue;
    }
    if (lines.length === 1 && lines[0].length < 72 && !/[.!?]$/.test(lines[0]) && !bullet(lines[0])) {
      blocks.push({ kind: "head", text: lines[0] });
      continue;
    }
    const prose: string[] = [];
    const items: string[] = [];
    for (const line of lines) {
      if (bullet(line)) items.push(clean(line));
      else prose.push(line);
    }
    if (prose.length) blocks.push({ kind: "para", text: prose.join(" ") });
    if (items.length) blocks.push({ kind: "list", items });
  }
  if (!blocks.length && text.trim()) blocks.push({ kind: "para", text: text.trim() });
  return blocks;
}

export function postedLabel(iso: string): string {
  const date = new Date(iso);
  const today = formatLongDate(new Date());
  const that = formatLongDate(date);
  if (today === that) return "Today";
  return that;
}

export function londonWeekday(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "Europe/London" }).format(date);
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
