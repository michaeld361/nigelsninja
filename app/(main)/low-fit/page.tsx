import Link from "next/link";
import { PromoteJob } from "@/components/promote-job";
import { listingDateShort, salaryLabel } from "@/lib/format";
import { loadStore } from "@/lib/store";
import type { Job } from "@/lib/types";

export default function LowFitPage() {
  const store = loadStore();
  const live = Boolean(process.env.APIFY_TOKEN);
  const linkedIn = (job: Job) => job.sources.some((source) => source.source === "linkedin") && (live ? !job.demo : true);
  const scoreOf = (jobId: string) =>
    store.fitAssessments
      .filter((fit) => fit.jobId === jobId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.score ?? null;
  const low = store.jobs
    .filter((job) => job.status === "low_fit" && linkedIn(job))
    .sort((a, b) => (scoreOf(b.id) ?? -1) - (scoreOf(a.id) ?? -1));
  const waiting = store.jobs.filter((job) => job.status === "unscored" && linkedIn(job));
  return (
    <div className="rise">
      <Link href="/jobs" className="eyebrow tracking-[0.12em] hover:text-[#FF6B5B]">
        ← Jobs
      </Link>
      <h1 className="display mt-6 text-[clamp(40px,11vw,56px)] sm:text-[clamp(64px,9vw,112px)]">Low fit</h1>
      <p className="mt-7 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">
        Roles the scorer held back. Move one onto Jobs if you still want a look.
      </p>
      <div className="mt-12 border-t border-[#F2F1EC]">
        {low.length === 0 ? (
          <div className="py-14 font-[family-name:var(--font-bricolage)] text-[28px] font-bold text-[rgba(242,241,236,0.5)] italic">
            Nothing sitting in low fit.
          </div>
        ) : (
          low.map((job, index) => <Row key={job.id} job={job} index={index} score={scoreOf(job.id)} />)
        )}
      </div>
      <h2 className="mt-16 font-[family-name:var(--font-bricolage)] text-[32px] font-bold tracking-[-0.02em]">Waiting to be scored</h2>
      <p className="mt-4 max-w-[52ch] text-[17px] leading-7 text-[rgba(242,241,236,0.7)]">
        These did not fit in the last run. The next search, every two hours, picks them up first.
      </p>
      <div className="mt-8 border-t border-[rgba(242,241,236,0.12)]">
        {waiting.length === 0 ? (
          <div className="py-10 text-[rgba(242,241,236,0.5)]">Nothing waiting.</div>
        ) : (
          waiting.map((job, index) => <Row key={job.id} job={job} index={index} score={null} />)
        )}
      </div>
    </div>
  );
}

function Row({ job, index, score }: { job: Job; index: number; score: number | null }) {
  const date = listingDateShort(job.postedAt);
  return (
    <article className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-b border-[rgba(242,241,236,0.12)] py-[30px] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-5">
      <div className="pt-3 font-mono text-xs text-[rgba(242,241,236,0.45)]">{String(index + 1).padStart(2, "0")}</div>
      <div className="min-w-0">
        <Link href={`/jobs/${job.id}`} className="font-[family-name:var(--font-bricolage)] text-[26px] leading-[1.1] font-bold tracking-[-0.02em] break-words text-[#F2F1EC] hover:text-[#FF6B5B] sm:text-[30px]">
          {job.title}
        </Link>
        <div className="mt-2 text-[19px]">{job.company}</div>
        <div className="mt-2.5 font-mono text-[11.5px] tracking-[0.02em] text-[rgba(242,241,236,0.55)]">
          {job.location}
          {date ? ` · ${date}` : ""}
          {score != null ? ` · ${score}` : ""} · <span className="text-[#F2F1EC]">{salaryLabel(job)}</span>
        </div>
      </div>
      <div className="col-start-2 sm:col-start-auto">
        <PromoteJob jobId={job.id} />
      </div>
    </article>
  );
}
