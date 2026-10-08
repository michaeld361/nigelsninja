import Link from "next/link";
import { JobActions } from "@/components/job-actions";
import { JobsRun } from "@/components/jobs-run";
import { JobsVisitLine } from "@/components/jobs-visit-line";
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
  const linkedIn = (job: Job) => job.sources.some((source) => source.source === "linkedin") && (live ? !job.demo : true);
  const skipped = store.jobs.filter((job) => job.status === "skipped" && linkedIn(job)).length;
  const low = store.jobs.filter((job) => (job.status === "low_fit" || job.status === "unscored") && linkedIn(job)).length;
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const filtered = store.jobs.filter(
    (job) => job.status === "filtered" && linkedIn(job) && new Date(job.firstSeenAt).getTime() >= monthAgo,
  ).length;
  const sample = !live && jobs.some((job) => job.demo);
  const searching = Boolean(store.runLock && new Date(store.runLock.until).getTime() > Date.now());
  const error = searching ? null : store.searchFailure?.message || linkedinError(run);
  return (
    <div className="rise">
      <JobsRun
        searching={searching}
        clock={run?.finishedAt ? formatClock(run.finishedAt) : "—"}
        fetched={run ? (run.counts.linkedin?.fetched ?? 0) : 0}
        worth={jobs.length}
        error={error}
        title={
          <div>
            <div className="eyebrow">{londonWeekday()} · {londonDayMonth()}</div>
            <h1 className="display mt-3.5 text-[clamp(40px,11vw,56px)] break-words sm:text-[clamp(64px,9vw,112px)]">Jobs</h1>
          </div>
        }
      />
      <JobsVisitLine />
      {sample ? (
        <p className="mt-6 max-w-[52ch] text-[15px] leading-6 text-[rgba(242,241,236,0.55)]">
          These are sample listings, so you can see how the page feels. Live LinkedIn roles appear once Apify is connected.
        </p>
      ) : null}
      <div className="mt-12 border-t border-[rgba(242,241,236,0.12)]">
        {jobs.length === 0 ? (
          <div className="py-14 font-[family-name:var(--font-bricolage)] text-[28px] font-bold text-[rgba(242,241,236,0.5)] italic">
            Nothing new to look at. The next search will add a role when one fits.
          </div>
        ) : (
          jobs.map((job, index) => (
            <article key={job.id} className="job-row grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-b border-[rgba(242,241,236,0.12)] py-[30px] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-5">
              <div className="pt-3 font-mono text-xs text-[rgba(242,241,236,0.45)]">{String(index + 1).padStart(2, "0")}</div>
              <div className="min-w-0">
                <Link
                  href={`/jobs/${job.id}`}
                  className="font-[family-name:var(--font-bricolage)] text-[26px] leading-[1.1] font-bold tracking-[-0.02em] break-words text-[#F2F1EC] hover:text-[#FF6B5B] sm:text-[30px]"
                >
                  {job.title}
                </Link>
                <div className="mt-2 text-[19px]">{job.company}</div>
                <JobFacts job={job} />
              </div>
              <div className="col-start-2 min-w-0 sm:col-start-auto">
                <JobActions jobId={job.id} />
              </div>
            </article>
          ))
        )}
      </div>
      <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
        <Link href="/low-fit" className="eyebrow tracking-[0.12em] text-[rgba(242,241,236,0.45)] hover:text-[#FF6B5B]">
          Low fit ({low}) →
        </Link>
        <Link href="/filtered" className="eyebrow tracking-[0.12em] text-[rgba(242,241,236,0.45)] hover:text-[#FF6B5B]">
          Filtered ({filtered}) →
        </Link>
        <Link href="/skipped" className="eyebrow tracking-[0.12em] text-[rgba(242,241,236,0.45)] hover:text-[#FF6B5B]">
          Skipped ({skipped}) →
        </Link>
      </div>
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
