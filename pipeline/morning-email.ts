import { londonWeekday } from "@/lib/format";
import { loadStore } from "@/lib/store";
import { formatLongDate } from "@/lib/text";
import type { FitAssessment, Job, Run, Store } from "@/lib/types";
import { emailDocument, escapeHtml } from "./brand-email";
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
  const stats = [
    [String(input.stats.searched), `${noun(input.stats.searched, "listing", "listings")} searched`],
    [String(input.stats.found), `${noun(input.stats.found, "role", "roles")} found`],
    [String(input.stats.fresh), "new"],
    [String(input.stats.applied), "on the apply list"],
    [String(input.stats.skipped), "skipped"],
  ];
  const body = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E0F11;color:#F2F1EC;">
    <tr>
      <td style="padding:40px 32px 72px;font-family:'Hanken Grotesk',Georgia,sans-serif;">
        <p style="margin:0;font-family:'Bricolage Grotesque',Georgia,sans-serif;font-weight:700;font-size:34px;line-height:1;letter-spacing:-.02em;color:#F2F1EC;">nigelsninja<span style="color:#FF6B5B;">.</span></p>
        <p style="margin:10px 0 0;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(242,241,236,.5);">Jobs · ${escapeHtml(input.date)}</p>
        <h1 style="margin:14px 0 0;font-family:'Bricolage Grotesque',Georgia,sans-serif;font-weight:700;font-size:64px;line-height:.9;letter-spacing:-.03em;color:#F2F1EC;">${escapeHtml(input.weekday)}</h1>
        <p style="margin:28px 0 0;max-width:42em;font-size:20px;line-height:1.45;color:rgba(242,241,236,.72);">Nigel, these are the roles that arrived since yesterday. Anything older is still on the site, and nothing has been sent for you.</p>
        ${strong.length ? sectionLabel("A strong fit") : ""}
        ${strong.length ? `<p style="margin:12px 0 0;font-size:17px;line-height:1.5;color:rgba(242,241,236,.72);">These sit closest to your CV. No hard mismatch came up in the fit check.</p>` : ""}
        ${strong.map((row) => jobBlock(row, input.base)).join("")}
        ${rest.length ? sectionLabel(strong.length ? "Also new" : "New since yesterday") : ""}
        ${rest.map((row) => jobBlock(row, input.base)).join("")}
        ${input.rows.length ? "" : `<p style="margin:40px 0 0;font-family:'Bricolage Grotesque',Georgia,sans-serif;font-weight:700;font-size:28px;font-style:italic;color:rgba(242,241,236,.5);">Nothing new arrived in the last day. The search is still running, and a good role will show up here when it does.</p>`}
        ${sectionLabel("The last day")}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;">
          <tr>
            ${stats
              .map(
                ([figure, label]) => `<td style="padding:0 28px 0 0;vertical-align:top;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.04em;color:rgba(242,241,236,.55);">
              <span style="color:#F2F1EC;font-size:14px;">${escapeHtml(figure)}</span><br>${escapeHtml(label)}
            </td>`,
              )
              .join("")}
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
  return emailDocument(body);
}

function jobBlock(row: Row, base: string): string {
  const colour = row.skipped ? "#9a938c" : "#F2F1EC";
  const href = `${base}/jobs/${row.job.id}`;
  const notes = [
    row.ultra ? "Strong fit" : "",
    row.onApplyList ? "On your apply list" : "",
    row.skipped ? "You skipped this" : "",
  ].filter(Boolean);
  const noteColour = row.skipped ? "#9a938c" : "rgba(242,241,236,.55)";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid rgba(242,241,236,.12);">
    <tr>
      <td style="padding:22px 0 0;color: ${colour};">
        <a href="${escapeHtml(href)}" style="font-family:'Bricolage Grotesque',Georgia,sans-serif;font-weight:700;font-size:28px;line-height:1.1;letter-spacing:-.02em;color: ${colour};text-decoration:none;">${escapeHtml(row.job.title)}</a>
        <div style="margin-top:8px;font-size:18px;color: ${colour};">${escapeHtml(row.job.company)} · ${escapeHtml(row.job.location)}</div>
        ${notes.length ? `<div style="margin-top:8px;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.04em;color:${noteColour};">${escapeHtml(notes.join(" · "))}</div>` : ""}
      </td>
    </tr>
  </table>`;
}

function sectionLabel(text: string): string {
  return `<p style="margin:40px 0 0;font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#FF6B5B;">${escapeHtml(text)}</p>`;
}

function noun(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
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
