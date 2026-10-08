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

const SANDBOX_FROM = "onboarding@resend.dev";
const SANDBOX_TO = "mail@michaeldown.co.uk";

/** Bare sandbox sender, unless DIGEST_FROM is an address on some other domain. */
export function resendFrom(configured = process.env.DIGEST_FROM || ""): string {
  const raw = configured.trim();
  const address = (raw.match(/<([^>]+)>/)?.[1] || raw).trim().toLowerCase();
  if (address.includes("@") && !address.endsWith("@resend.dev")) return raw;
  return SANDBOX_FROM;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<{ sent: boolean; error?: string; id?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, error: "RESEND_API_KEY is not set" };
  const recipient = to.trim().toLowerCase();
  if (recipient === "nigel@nigeldown.com") {
    return { sent: false, error: "The email was not sent." };
  }
  const from = resendFrom();
  if (from === SANDBOX_FROM && recipient !== SANDBOX_TO) {
    return { sent: false, error: "Resend's sandbox only delivers to mail@michaeldown.co.uk, so the email was not sent." };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "User-Agent": "nigelsninja",
      },
      body: JSON.stringify({ from, to: [recipient], subject, html }),
    });
    const body = await response.text();
    if (!response.ok) return { sent: false, error: hideSecret(resendError(response.status, body), key) };
    let id = "";
    try {
      const parsed = JSON.parse(body) as { id?: string };
      id = parsed.id || "";
    } catch {
      id = "";
    }
    if (!id) return { sent: false, error: "Resend did not accept the email." };
    return { sent: true, id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The email was not sent.";
    return { sent: false, error: hideSecret(message, key) };
  }
}

function hideSecret(message: string, secret: string): string {
  return secret ? message.split(secret).join("") : message;
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
