import Link from "next/link";
import { JobActions } from "@/components/job-actions";
import { SearchTrigger } from "@/components/search-trigger";
import { listingDateShort, londonDayMonth, londonWeekday, salaryLabel } from "@/lib/format";
import { formatClock } from "@/lib/text";
import { loadStore } from "@/lib/store";
import type { Job, Run } from "@/lib/types";
import { practisingQualificationReason } from "@/pipeline/prefilter";

export const maxDuration = 300;

export default function JobsPage() {
  const store = loadStore();
  const listed = new Set(store.applyPacks.map((pack) => pack.jobId));
  const live = Boolean(process.env.APIFY_TOKEN);
  const jobs = store.jobs
    .filter((job) => job.status === "new" && job.sources.some((source) => source.source === "linkedin") && !listed.has(job.id))
    .filter((job) => !practisingQualificationReason(job.title, job.descriptionText))
    .filter((job) => (live ? !job.demo : true))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  const run = store.runs.find((item) => item.finishedAt && (live ? !item.counts.linkedin?.demo : true)) ?? null;
  const skipped = store.jobs.filter(
    (job) => job.status === "skipped" && job.sources.some((source) => source.source === "linkedin") && (live ? !job.demo : true),
  ).length;
  const sample = !live && jobs.some((job) => job.demo);
  const error = linkedinError(run);
  return (
    <div className="rise">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[#F2F1EC] pb-7">
        <div>
          <div className="eyebrow">Jobs · {londonDayMonth()}</div>
          <h1 className="display mt-3.5 text-[clamp(64px,9vw,112px)]">{londonWeekday()}</h1>
        </div>
        <SearchTrigger />
      </div>
      <div className="grid grid-cols-1 gap-6 pt-[22px] font-mono text-[11px] tracking-[0.04em] text-[rgba(242,241,236,0.55)] sm:grid-cols-3 sm:justify-start sm:gap-10">
        <div>
          <span className="text-sm text-[#F2F1EC]">{run?.finishedAt ? formatClock(run.finishedAt) : "—"}</span>
          <br />
          last search
        </div>
        <div>
          <span className="text-sm text-[#F2F1EC]">{run ? (run.counts.linkedin?.fetched ?? 0) : 0}</span>
          <br />
          listings searched
        </div>
        <div>
          <span className="text-sm text-[#FF6B5B]">{jobs.length}</span>
          <br />
          worth a look
        </div>
      </div>
      <p className="mt-10 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">
        A few LinkedIn privacy roles that fit the search you set. Add one when you want a letter. You send it yourself.
      </p>
      {sample ? (
        <p className="mt-6 max-w-[52ch] text-[15px] leading-6 text-[rgba(242,241,236,0.55)]">
          These are sample listings, so you can see how the page feels. Live LinkedIn roles appear once Apify is connected.
        </p>
      ) : null}
      {error ? <p className="mt-6 max-w-[52ch] text-[15px] leading-6 text-[#B3261E]">{error}</p> : null}
      <div className="mt-12 border-t border-[rgba(242,241,236,0.12)]">
        {jobs.length === 0 ? (
          <div className="py-14 font-[family-name:var(--font-display)] text-[28px] font-bold text-[rgba(242,241,236,0.5)] italic">
            Nothing left to look at today.
          </div>
        ) : (
          jobs.map((job, index) => (
            <article key={job.id} className="job-row grid grid-cols-1 items-start gap-4 border-b border-[rgba(242,241,236,0.12)] py-[30px] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-5">
              <div className="pt-3 font-mono text-xs text-[rgba(242,241,236,0.45)]">{String(index + 1).padStart(2, "0")}</div>
              <div className="min-w-0">
                <Link
                  href={`/jobs/${job.id}`}
                  className="font-[family-name:var(--font-display)] text-[30px] leading-[1.1] font-bold tracking-[-0.02em] text-[#F2F1EC] hover:text-[#FF6B5B]"
                >
                  {job.title}
                </Link>
                <div className="mt-2 text-[19px]">{job.company}</div>
                <JobFacts job={job} />
              </div>
              <JobActions jobId={job.id} />
            </article>
          ))
        )}
      </div>
      <Link href="/skipped" className="eyebrow mt-7 inline-block tracking-[0.12em] hover:text-[#FF6B5B]">
        Skipped ({skipped}) →
      </Link>
    </div>
  );
}

function JobFacts({ job }: { job: Job }) {
  const date = listingDateShort(job.postedAt);
  return (
    <div className="mt-2.5 font-mono text-[11.5px] tracking-[0.02em] text-[rgba(242,241,236,0.55)]">
      {job.location}
      {date ? ` · ${date}` : ""}
      {job.demo ? " · Sample" : ""} · <span className="text-[#F2F1EC]">{salaryLabel(job)}</span>
    </div>
  );
}

function linkedinError(run: Run | null): string | null {
  const error = run?.counts.linkedin?.error;
  if (!error || run.counts.linkedin.demo) return null;
  let text = error;
  const secret = process.env.APIFY_TOKEN;
  if (secret) text = text.split(secret).join("");
  text = text.replace(/apify_api_[A-Za-z0-9]+/g, "").replace(/\s+/g, " ").trim();
  return text || "LinkedIn fetch failed.";
}
