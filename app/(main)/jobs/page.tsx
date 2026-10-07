import Link from "next/link";
import { AddToApply } from "@/components/add-to-apply";
import { salaryLabel } from "@/lib/format";
import { loadStore } from "@/lib/store";
import type { Run } from "@/lib/types";

export default function JobsPage() {
  const store = loadStore();
  const listed = new Set(store.applyPacks.map((pack) => pack.jobId));
  const live = Boolean(process.env.APIFY_TOKEN);
  const jobs = store.jobs
    .filter((job) => job.status === "new" && job.sources.some((source) => source.source === "linkedin") && !listed.has(job.id))
    .filter((job) => (live ? !job.demo : true))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  const run = store.runs.find((item) => item.finishedAt) ?? null;
  const sample = !live && jobs.some((job) => job.demo);
  return (
    <div>
      <p className="text-sm text-muted-foreground">{lookLine(run)}</p>
      <h1 className="mt-3 font-serif text-5xl tracking-tight">Jobs</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
        LinkedIn roles that match your search. If one is worth applying for, add it. Nothing is sent for you.
      </p>
      {sample ? (
        <p className="mt-6 max-w-xl text-sm leading-6 text-muted-foreground">
          These are sample listings. Apify is not connected, so they are not live LinkedIn vacancies.
        </p>
      ) : null}
      {jobs.length === 0 ? (
        <p className="mt-16 max-w-xl font-serif text-3xl leading-snug tracking-tight">
          Nothing new from LinkedIn. When a role is worth your time, it will be here.
        </p>
      ) : (
        <ul className="mt-12">
          {jobs.map((job) => (
            <li key={job.id} className="border-t py-8">
              <Link href={`/jobs/${job.id}`} className="block">
                <h2 className="font-serif text-3xl tracking-tight">{job.title}</h2>
                <p className="mt-1 text-lg">{job.company}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {job.location}
                  {job.demo ? " · Sample" : ""} · {salaryLabel(job)}
                </p>
              </Link>
              <div className="mt-5">
                <AddToApply jobId={job.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function lookLine(run: Run | null): string {
  if (!run?.finishedAt) return "No look at LinkedIn yet.";
  const clock = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/London",
  }).format(new Date(run.finishedAt));
  const fetched = run.counts.linkedin?.fetched ?? run.totals.fetched;
  return `Last look at ${clock}. ${fetched} from LinkedIn.`;
}
