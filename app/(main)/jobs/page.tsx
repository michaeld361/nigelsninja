import Link from "next/link";
import { JobActions } from "@/components/job-actions";
import { SearchTrigger } from "@/components/search-trigger";
import { jobMeta, londonWeekday, searchStatusLine } from "@/lib/format";
import { loadStore } from "@/lib/store";
import type { Run } from "@/lib/types";
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
  const run = store.runs.find((item) => item.finishedAt) ?? null;
  const sample = !live && jobs.some((job) => job.demo);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-sm text-muted-foreground">
          {searchStatusLine(
            run?.finishedAt
              ? { finishedAt: run.finishedAt, searched: run.counts.linkedin?.fetched ?? 0, found: run.totals.worthALook }
              : null,
          )}
        </p>
        <SearchTrigger />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">Jobs</p>
      <h1 className="mt-2 font-serif text-6xl tracking-tight">{londonWeekday()}</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
        A few LinkedIn privacy roles that fit the search you set. Add one when you want a letter. You send it yourself.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/skipped" className="text-muted-foreground underline decoration-foreground/20 underline-offset-4">
          Skipped
        </Link>
      </p>
      {sample ? (
        <p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground">
          These are sample listings, so you can see how the page feels. Live LinkedIn roles appear once Apify is connected.
        </p>
      ) : null}
      {jobs.length === 0 ? (
        <p className="mt-16 max-w-xl font-serif text-3xl leading-snug tracking-tight">
          {linkedinError(run) ?? "Nothing new this time. A role that fits will land here, and the next look is already on the clock."}
        </p>
      ) : (
        <ul className="mt-12">
          {jobs.map((job) => (
            <li key={job.id} className="border-t py-8">
              <Link href={`/jobs/${job.id}`} className="block">
                <h2 className="font-serif text-3xl tracking-tight">{job.title}</h2>
                <p className="mt-1 text-lg">{job.company}</p>
                <p className="mt-2 text-sm text-muted-foreground">{jobMeta(job)}</p>
              </Link>
              <div className="mt-5">
                <JobActions jobId={job.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
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

