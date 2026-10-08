import { getSession } from "@/lib/auth";
import { isApplicationStage, STAGE_LABEL } from "@/lib/stages";
import { loadStore } from "@/lib/store";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) return new NextResponse("Sign in required", { status: 401 });
  const store = loadStore();
  const rows = [["Applied", "Company", "Title", "Status", "Score", "Source", "URL"]];
  for (const job of store.jobs.filter((item) => isApplicationStage(item.status) || store.applications.some((app) => app.jobId === item.id))) {
    const fit = store.fitAssessments.find((item) => item.jobId === job.id);
    const application = store.applications.find((item) => item.jobId === job.id);
    rows.push([
      (application?.appliedAt || job.statusChangedAt).slice(0, 10),
      job.company,
      job.title,
      isApplicationStage(job.status) ? STAGE_LABEL[job.status] : job.status,
      fit ? String(fit.score) : "",
      job.sources.map((source) => source.publisher || source.source).join("; "),
      job.sources.map((source) => source.url).filter(Boolean).join(" "),
    ]);
  }
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=applied.csv",
    },
  });
}
