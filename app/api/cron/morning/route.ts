import { cronAuthorized } from "@/lib/cron-auth";
import { runMorningSlot } from "@/pipeline/morning-schedule";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ ok: false }, { status: 401 });
  const result = await runMorningSlot();
  const skipped = result.skipped === "waiting";
  return Response.json({
    ok: result.sent || skipped,
    sent: result.sent,
    skipped: result.skipped || null,
    subject: result.subject || null,
    nextRunAt: result.nextRunAt,
    error: result.error || null,
  });
}
