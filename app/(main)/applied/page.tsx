import Link from "next/link";
import { RejectionNote } from "@/components/rejection-note";
import { StageSelect } from "@/components/stage-select";
import { listingDateShort, salaryLabel } from "@/lib/format";
import { isApplicationStage } from "@/lib/stages";
import { loadStore } from "@/lib/store";

export default function AppliedPage() {
  const store = loadStore();
  const live = Boolean(process.env.APIFY_TOKEN);
  const jobs = store.jobs
    .filter((job) => isApplicationStage(job.status) && job.sources.some((source) => source.source === "linkedin"))
    .filter((job) => (live ? !job.demo : true))
    .sort((a, b) => b.statusChangedAt.localeCompare(a.statusChangedAt));
  return (
    <div className="rise">
      <h1 className="display text-[clamp(40px,11vw,56px)] sm:text-[clamp(64px,9vw,112px)]">Applied</h1>
      <p className="mt-7 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">
        Sent. Change the stage when you hear back.
      </p>
      <div className="mt-12 border-t border-[#F2F1EC]">
        {jobs.length === 0 ? (
          <div className="py-14 font-[family-name:var(--font-bricolage)] text-[28px] font-bold text-[rgba(242,241,236,0.5)] italic">
            Nothing sent yet.
          </div>
        ) : (
          jobs.map((job, index) => {
            const date = listingDateShort(job.postedAt);
            const stage = isApplicationStage(job.status) ? job.status : "applied";
            return (
              <article
                key={job.id}
                className="job-row grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-b border-[rgba(242,241,236,0.12)] py-[30px] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-5"
              >
                <div className="pt-3 font-mono text-xs text-[rgba(242,241,236,0.45)] sm:pt-0">{String(index + 1).padStart(2, "0")}</div>
                <div className="min-w-0">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-[family-name:var(--font-bricolage)] text-[26px] leading-[1.1] font-bold tracking-[-0.02em] break-words text-[#F2F1EC] hover:text-[#FF6B5B] sm:text-[30px]"
                  >
                    {job.title}
                  </Link>
                  <div className="mt-2 text-[19px]">{job.company}</div>
                  <div className="mt-2.5 font-mono text-[11.5px] text-[rgba(242,241,236,0.55)]">
                    {job.location}
                    {date ? ` · ${date}` : ""} · {salaryLabel(job)}
                  </div>
                  {stage === "rejected" ? (
                    <RejectionNote
                      jobId={job.id}
                      reason={store.learnings.find((item) => item.jobId === job.id)?.reason ?? ""}
                      date={store.learnings.find((item) => item.jobId === job.id)?.at ?? null}
                    />
                  ) : null}
                </div>
                <div className="col-start-2 min-w-0 sm:col-start-auto">
                  <StageSelect jobId={job.id} stage={stage} />
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
