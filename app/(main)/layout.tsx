import { Shell } from "@/components/shell";
import { requireSession } from "@/lib/auth";
import { loadStore } from "@/lib/store";
import { practisingQualificationReason } from "@/pipeline/prefilter";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const store = loadStore();
  const listed = new Set(store.applyPacks.map((pack) => pack.jobId));
  const live = Boolean(process.env.APIFY_TOKEN);
  const jobs = store.jobs
    .filter((job) => job.status === "new" && job.sources.some((source) => source.source === "linkedin") && !listed.has(job.id))
    .filter((job) => !practisingQualificationReason(job.title, job.descriptionText))
    .filter((job) => (live ? !job.demo : true));
  const searches = store.runs.filter((run) => run.finishedAt && (live ? !run.counts.linkedin?.demo : true)).length;
  return (
    <Shell name={session.name} role={session.role} counts={{ jobs: jobs.length, market: searches, apply: store.applyPacks.length }}>
      {children}
    </Shell>
  );
}
