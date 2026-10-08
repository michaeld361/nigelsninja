import Link from "next/link";
import { listingDateShort } from "@/lib/format";
import { loadStore } from "@/lib/store";
import type { Job } from "@/lib/types";

const MONTH = 30 * 24 * 60 * 60 * 1000;

export default function FilteredPage() {
  const store = loadStore();
  const live = Boolean(process.env.APIFY_TOKEN);
  const now = Date.now();
  const jobs = store.jobs.filter((job) => {
    if (job.status !== "filtered") return false;
    if (!job.sources.some((source) => source.source === "linkedin")) return false;
    if (live && job.demo) return false;
    return now - new Date(job.firstSeenAt).getTime() <= MONTH;
  });
  const groups = new Map<string, Job[]>();
  for (const job of jobs) {
    const reason = job.filteredReason || "No reason recorded";
    const list = groups.get(reason) || [];
    list.push(job);
    groups.set(reason, list);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  return (
    <div className="rise">
      <Link href="/jobs" className="eyebrow tracking-[0.12em] hover:text-[#FF6B5B]">
        ← Jobs
      </Link>
      <h1 className="display mt-6 text-[clamp(40px,11vw,56px)] sm:text-[clamp(64px,9vw,112px)]">Filtered</h1>
      <p className="mt-7 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">
        Roles the rules set aside, grouped by why. They stay here for 30 days.
      </p>
      {ordered.length === 0 ? (
        <div className="mt-12 border-t border-[#F2F1EC] py-14 font-[family-name:var(--font-bricolage)] text-[28px] font-bold text-[rgba(242,241,236,0.5)] italic">
          Nothing filtered in the last 30 days.
        </div>
      ) : (
        ordered.map(([reason, rows]) => (
          <section key={reason} className="mt-12">
            <h2 className="eyebrow text-[#FF6B5B]">
              {reason} · {rows.length}
            </h2>
            <div className="mt-4 border-t border-[rgba(242,241,236,0.12)]">
              {rows.map((job) => {
                const date = listingDateShort(job.postedAt);
                return (
                  <article key={job.id} className="border-b border-[rgba(242,241,236,0.12)] py-6">
                    <Link href={`/jobs/${job.id}`} className="font-[family-name:var(--font-bricolage)] text-[24px] leading-[1.15] font-bold tracking-[-0.02em] text-[#F2F1EC] hover:text-[#FF6B5B]">
                      {job.title}
                    </Link>
                    <div className="mt-1.5 text-[17px] text-[rgba(242,241,236,0.75)]">
                      {job.company}
                      {job.location ? ` · ${job.location}` : ""}
                      {date ? ` · ${date}` : ""}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
