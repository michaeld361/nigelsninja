import Link from "next/link";
import { RestoreJob } from "@/components/restore-job";
import { listingDateShort, salaryLabel } from "@/lib/format";
import { loadStore } from "@/lib/store";

export default function SkippedPage() {
  const store = loadStore();
  const live = Boolean(process.env.APIFY_TOKEN);
  const jobs = store.jobs
    .filter((job) => job.status === "skipped" && job.sources.some((source) => source.source === "linkedin"))
    .filter((job) => (live ? !job.demo : true))
    .sort((a, b) => b.statusChangedAt.localeCompare(a.statusChangedAt));
  return (
    <div className="rise">
      <Link href="/jobs" className="eyebrow tracking-[0.12em] hover:text-[#FF6B5B]">
        ← Jobs
      </Link>
      <h1 className="display mt-6 text-[clamp(64px,9vw,112px)]">Skipped</h1>
      <p className="mt-7 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">
        Roles you have set aside. They stay here if you want another look, and they do not sit on a pipeline.
      </p>
      <div className="mt-12 border-t border-[#F2F1EC]">
        {jobs.length === 0 ? (
          <div className="py-14 font-[family-name:var(--font-bricolage)] text-[28px] font-bold text-[rgba(242,241,236,0.5)] italic">
            You have not set a role aside yet.
          </div>
        ) : (
          jobs.map((job, index) => {
            const date = listingDateShort(job.postedAt);
            return (
              <article key={job.id} className="grid grid-cols-1 items-start gap-4 border-b border-[rgba(242,241,236,0.12)] py-[30px] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-5">
                <div className="pt-3 font-mono text-xs text-[rgba(242,241,236,0.45)]">{String(index + 1).padStart(2, "0")}</div>
                <div className="min-w-0">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-[family-name:var(--font-bricolage)] text-[30px] leading-[1.1] font-bold tracking-[-0.02em] text-[rgba(242,241,236,0.6)] hover:text-[#FF6B5B]"
                  >
                    {job.title}
                  </Link>
                  <div className="mt-2 text-[19px]">{job.company}</div>
                  <div className="mt-2.5 font-mono text-[11.5px] text-[rgba(242,241,236,0.55)]">
                    {job.location}
                    {date ? ` · ${date}` : ""} · {salaryLabel(job)}
                  </div>
                </div>
                <RestoreJob jobId={job.id} />
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
