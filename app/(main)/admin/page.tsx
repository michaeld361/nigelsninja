import { AdminPanel } from "@/components/admin-panel";
import { requireSession } from "@/lib/auth";
import { loadStore } from "@/lib/store";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/jobs");
  const store = loadStore();
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).format(new Date());
  const spend = store.runs
    .filter((run) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).format(new Date(run.startedAt)) === month)
    .reduce((sum, run) => sum + run.estimatedCostUsd, 0);
  const keys = [
    ["ANTHROPIC_API_KEY", Boolean(process.env.ANTHROPIC_API_KEY)],
    ["APIFY_TOKEN", Boolean(process.env.APIFY_TOKEN)],
    ["REED_API_KEY", Boolean(process.env.REED_API_KEY)],
    ["RAPIDAPI_KEY", Boolean(process.env.RAPIDAPI_KEY)],
    ["RESEND_API_KEY", Boolean(process.env.RESEND_API_KEY)],
    ["WRITING_MODEL", process.env.WRITING_MODEL || "claude-fable-5-1 (default)"],
    ["SCORING_MODEL", process.env.SCORING_MODEL || "claude-sonnet-5-5 (default)"],
  ] as const;
  return (
    <AdminPanel
      runs={store.runs}
      spend={spend}
      ceiling={store.settings.monthlySpendCeilingUsd}
      keys={keys.map(([name, set]) => ({ name, set: typeof set === "string" ? true : set }))}
    />
  );
}
