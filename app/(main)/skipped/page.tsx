import Link from "next/link";
import { jobMeta } from "@/lib/format";
import { loadStore } from "@/lib/store";

export default function SkippedPage() {
  const store = loadStore();
  const live = Boolean(process.env.APIFY_TOKEN);
  const jobs = store.jobs
    .filter((job) => job.status === "skipped" && job.sources.some((source) => source.source === "linkedin"))
    .filter((job) => (live ? !job.demo : true))
    .sort((a, b) => b.statusChangedAt.localeCompare(a.statusChangedAt));
  return (
    <div>
      <Link href="/jobs" className="text-sm text-muted-foreground">
        Jobs
      </Link>
      <h1 className="mt-3 font-serif text-5xl tracking-tight">Skipped</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
        Roles you have set aside. They stay here if you want another look, and they do not sit on a pipeline.
      </p>
      {jobs.length === 0 ? (
        <p className="mt-16 max-w-xl font-serif text-3xl leading-snug tracking-tight">You have not set a role aside yet.</p>
      ) : (
        <ul className="mt-12">
          {jobs.map((job) => (
            <li key={job.id} className="border-t py-8">
              <Link href={`/jobs/${job.id}`} className="block">
                <h2 className="font-serif text-3xl tracking-tight">{job.title}</h2>
                <p className="mt-1 text-lg">{job.company}</p>
                <p className="mt-2 text-sm text-muted-foreground">{jobMeta(job)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
