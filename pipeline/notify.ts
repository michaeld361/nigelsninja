import { formatLongDate } from "@/lib/text";
import type { Job, Run } from "@/lib/types";

export function buildDigest(run: Run, top: { job: Job; score: number }[]): string {
  const when = formatLongDate(run.finishedAt || run.startedAt);
  const items = top
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.job.title)}</strong> at ${escapeHtml(item.job.company)} (${item.score})<br>${escapeHtml(item.job.location)}</li>`,
    )
    .join("");
  return `<p>Nigel, the ${when} run finished at ${escapeHtml((run.finishedAt || "").slice(11, 16))}.</p>
<p>${run.totals.fetched} fetched, ${run.totals.new} new, ${run.totals.worthALook} worth a look.</p>
${items ? `<p>Top roles:</p><ol>${items}</ol>` : "<p>Nothing new scored above the line today.</p>"}
<p>Open Today in the assistant to review letters. Nothing has been submitted.</p>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, error: "RESEND_API_KEY is not set" };
  const from = process.env.DIGEST_FROM || "nigelsninja <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (response.ok) return { sent: true };
  const body = await response.text();
  return { sent: false, error: resendError(response.status, body) };
}

function resendError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string; name?: string; error?: { message?: string } };
    const message = parsed.message || parsed.error?.message;
    if (message) return `Resend ${status}: ${message}`;
  } catch {
    /* body was not JSON */
  }
  const text = body.replace(/\s+/g, " ").trim();
  return text ? `Resend ${status}: ${text.slice(0, 500)}` : `Resend ${status}`;
}
