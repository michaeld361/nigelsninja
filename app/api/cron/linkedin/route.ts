import { cronAuthorized, redactSecrets } from "@/lib/cron-auth";
import { runPipeline } from "@/pipeline/run";

export const runtime = "nodejs";
export const maxDuration = 900;

export async function POST(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ ok: false }, { status: 401 });
  const result = await runPipeline({ trigger: "cron", by: "render", sources: ["linkedin"] });
  if (!result.ok) return Response.json({ ok: false, error: redactSecrets(result.message || "The LinkedIn search did not finish.") }, { status: 500 });
  return Response.json({
    ok: true,
    fetched: result.run.totals.fetched,
    fresh: result.run.totals.new,
    letters: result.run.totals.letters,
  });
}
