import Link from "next/link";
import { JobActions } from "@/components/job-actions";
import { MissingJob } from "@/components/missing-job";
import { PreparingLine } from "@/components/preparing-line";
import { jobMeta } from "@/lib/format";
import { loadStore } from "@/lib/store";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = loadStore();
  const job = store.jobs.find((item) => item.id === id);
  if (!job) return <MissingJob />;
  const pack = store.applyPacks.find((item) => item.jobId === job.id);
  const listing = job.sources.find((source) => source.source === "linkedin") ?? job.sources[0];
  return (
    <article>
      <Link href={job.status === "skipped" ? "/skipped" : "/jobs"} className="text-sm text-muted-foreground">
        {job.status === "skipped" ? "Skipped" : "Jobs"}
      </Link>
      <h1 className="mt-4 font-serif text-5xl tracking-tight">{job.title}</h1>
      <p className="mt-2 text-xl">{job.company}</p>
      <p className="mt-2 text-sm text-muted-foreground">{jobMeta(job)}</p>
      <div className="mt-8">
        {pack ? (
          <div>
            <Link href={`/apply/${job.id}`} className="font-serif text-xl text-primary underline decoration-primary/30 underline-offset-8">
              Open on your apply list
            </Link>
            {pack.state === "preparing" ? (
              <p className="mt-4 max-w-xl text-sm text-muted-foreground" aria-busy="true" aria-live="polite">
                <PreparingLine />
              </p>
            ) : null}
          </div>
        ) : (
          <JobActions jobId={job.id} allowSkip={job.status !== "skipped"} />
        )}
      </div>
      {listing ? (
        <p className="mt-6 text-sm">
          <a className="underline" href={listing.url} target="_blank" rel="noreferrer">
            View on LinkedIn
          </a>
        </p>
      ) : null}
      <div className="mt-10 max-w-xl whitespace-pre-wrap text-base leading-8">{job.descriptionText}</div>
    </article>
  );
}
