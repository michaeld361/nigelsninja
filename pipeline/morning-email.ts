import { londonWeekday } from "@/lib/format";
import { loadStore } from "@/lib/store";
import { formatLongDate } from "@/lib/text";
import type { FitAssessment, Job, Run, Store } from "@/lib/types";
import { sendEmail } from "./notify";

export const MORNING_TO = "mail@michaeldown.co.uk";
const DAY_MS = 24 * 60 * 60 * 1000;
const ULTRA_SCORE = 90;

export type MorningStats = {
  searched: number;
  found: number;
  fresh: number;
  applied: number;
  skipped: number;
};

export type MorningEmail = {
  subject: string;
  html: string;
  stats: MorningStats;
};

type Row = {
  job: Job;
  score: number | null;
  blockers: number;
  ultra: boolean;
  onApplyList: boolean;
  skipped: boolean;
};

export function buildMorningEmail(store: Store, now = new Date(), appUrl = process.env.APP_URL || ""): MorningEmail {
  const base = appUrl.replace(/\/$/, "");
  const start = now.getTime() - DAY_MS;
  const inWindow = (iso: string | null | undefined) => {
    if (!iso) return false;
    const time = new Date(iso).getTime();
    return time >= start && time <= now.getTime();
  };
  const fits = latestFits(store.fitAssessments);
  const listed = new Set(store.applyPacks.map((pack) => pack.jobId));
  const rows = store.jobs
    .filter((job) => !job.demo && job.status !== "filtered" && inWindow(job.firstSeenAt))
    .map((job) => toRow(job, fits.get(job.id), listed.has(job.id)))
    .sort((a, b) => Number(b.ultra) - Number(a.ultra) || (b.score ?? -1) - (a.score ?? -1) || a.job.title.localeCompare(b.job.title));
  const liveRuns = store.runs.filter((run) => inWindow(run.finishedAt) && !run.counts.linkedin?.demo);
  const stats: MorningStats = {
    searched: liveRuns.reduce((sum, run) => sum + (run.counts.linkedin?.fetched ?? 0), 0),
    found: liveRuns.reduce((sum, run) => sum + run.totals.worthALook, 0),
    fresh: rows.length,
    applied: store.applyPacks.filter((pack) => inWindow(pack.createdAt)).length,
    skipped: store.jobs.filter((job) => !job.demo && job.status === "skipped" && inWindow(job.statusChangedAt)).length,
  };
  const weekday = londonWeekday(now);
  const date = formatLongDate(now);
  return {
    subject: `${weekday}. Your roles from the last day`,
    html: render({ weekday, date, base, rows, stats }),
    stats,
  };
}

export async function sendMorningEmail(now = new Date()): Promise<{ sent: boolean; error?: string; subject: string }> {
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  const email = buildMorningEmail(loadStore(), now, base);
  if (!base || /127\.0\.0\.1|localhost/i.test(base)) {
    return { sent: false, subject: email.subject, error: "APP_URL is missing or points at this machine, so the email was not sent." };
  }
  if (MORNING_TO.toLowerCase() === "nigel@nigeldown.com") {
    return { sent: false, subject: email.subject, error: "Refusing to email Nigel." };
  }
  const result = await sendEmail(MORNING_TO, email.subject, email.html);
  if (!result.sent) return { sent: false, subject: email.subject, error: publicError(result.error || "Resend did not accept the email.") };
  return { sent: true, subject: email.subject };
}

function toRow(job: Job, fit: FitAssessment | undefined, onApplyList: boolean): Row {
  const blockers = fit?.blockers.length ?? 0;
  const score = fit?.score ?? null;
  return {
    job,
    score,
    blockers,
    ultra: score != null && score >= ULTRA_SCORE && blockers === 0,
    onApplyList,
    skipped: job.status === "skipped",
  };
}

function latestFits(fits: FitAssessment[]): Map<string, FitAssessment> {
  const map = new Map<string, FitAssessment>();
  for (const fit of fits) {
    const current = map.get(fit.jobId);
    if (!current || fit.createdAt > current.createdAt) map.set(fit.jobId, fit);
  }
  return map;
}

function render(input: { weekday: string; date: string; base: string; rows: Row[]; stats: MorningStats }): string {
  const strong = input.rows.filter((row) => row.ultra);
  const rest = input.rows.filter((row) => !row.ultra);
  const blocks = [
    paragraph(`Nigel, these are the roles that arrived since yesterday. Anything older is still on the site, and nothing has been sent for you.`),
    strong.length ? heading("A strong fit") : "",
    strong.length ? paragraph("These sit closest to your CV. No hard mismatch came up in the fit check.") : "",
    strong.map((row) => jobBlock(row, input.base)).join(""),
    rest.length ? heading(strong.length ? "Also new" : "New since yesterday") : "",
    rest.map((row) => jobBlock(row, input.base)).join(""),
    input.rows.length ? "" : paragraph("Nothing new arrived in the last day. The search is still running, and a good role will show up here when it does."),
    heading("The last day"),
    `<ul style="padding-left: 1.2rem; line-height: 1.6;">
      <li>${input.stats.searched} ${noun(input.stats.searched, "listing", "listings")} searched</li>
      <li>${input.stats.found} ${noun(input.stats.found, "role", "roles")} found</li>
      <li>${input.stats.fresh} new</li>
      <li>${input.stats.applied} went to your apply list</li>
      <li>${input.stats.skipped} skipped</li>
    </ul>`,
  ];
  return `<div style="font-family: Georgia, 'Times New Roman', serif; color: #241f1c; max-width: 36rem; line-height: 1.5;">
    <p style="margin: 0; color: #6b645e;">Jobs</p>
    <h1 style="font-weight: normal; font-size: 32px; margin: 8px 0 0;">${escapeHtml(input.weekday)}</h1>
    <p style="margin: 4px 0 24px; color: #6b645e;">${escapeHtml(input.date)}</p>
    ${blocks.join("\n")}
  </div>`;
}

function jobBlock(row: Row, base: string): string {
  const colour = row.skipped ? "#9a938c" : "#241f1c";
  const href = `${base}/jobs/${row.job.id}`;
  const notes = [
    row.ultra ? "Strong fit" : "",
    row.onApplyList ? "On your apply list" : "",
    row.skipped ? "You skipped this" : "",
  ].filter(Boolean);
  return `<p style="margin: 0 0 20px; color: ${colour};">
    <a href="${escapeHtml(href)}" style="color: ${colour};">${escapeHtml(row.job.title)}</a><br>
    ${escapeHtml(row.job.company)} · ${escapeHtml(row.job.location)}
    ${notes.length ? `<br><span style="color: ${row.skipped ? "#9a938c" : "#6b645e"};">${escapeHtml(notes.join(" · "))}</span>` : ""}
  </p>`;
}

function heading(text: string): string {
  return `<h2 style="font-weight: normal; font-size: 22px; margin: 28px 0 8px;">${escapeHtml(text)}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px;">${escapeHtml(text)}</p>`;
}

function noun(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function publicError(message: string): string {
  let text = message;
  const secret = process.env.RESEND_API_KEY;
  if (secret) text = text.split(secret).join("");
  return text.replace(/\s+/g, " ").trim();
}

export function liveRunsInWindow(runs: Run[], now: Date): Run[] {
  const start = now.getTime() - DAY_MS;
  return runs.filter((run) => {
    if (!run.finishedAt || run.counts.linkedin?.demo) return false;
    const time = new Date(run.finishedAt).getTime();
    return time >= start && time <= now.getTime();
  });
}
