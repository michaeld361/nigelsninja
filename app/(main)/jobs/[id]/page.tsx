import Link from "next/link";
import { JobActions } from "@/components/job-actions";
import { MissingJob } from "@/components/missing-job";
import { PreparingLine } from "@/components/preparing-line";
import { listingBlocks, listingDateShort, salaryLabel } from "@/lib/format";
import { loadStore } from "@/lib/store";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = loadStore();
  const job = store.jobs.find((item) => item.id === id);
  if (!job) return <MissingJob />;
  const pack = store.applyPacks.find((item) => item.jobId === job.id);
  const listing = job.sources.find((source) => source.source === "linkedin") ?? job.sources[0];
  const back = job.status === "skipped" ? "/skipped" : "/jobs";
  const date = listingDateShort(job.postedAt);
  const blocks = listingBlocks(job.descriptionText);
  return (
    <article className="rise">
      <Link href={back} className="eyebrow tracking-[0.12em] hover:text-[#FF6B5B]">
        ← {job.status === "skipped" ? "Skipped" : "Jobs"}
      </Link>
      <h1 className="display mt-7 text-[clamp(44px,6vw,72px)] leading-[0.98]">{job.title}</h1>
      <div className="mt-3.5 text-[22px]">{job.company}</div>
      <div className="mt-2.5 font-mono text-[11.5px] tracking-[0.02em] text-[rgba(242,241,236,0.55)]">
        {job.location}
        {date ? ` · ${date}` : ""}
        {job.demo ? " · Sample" : ""} · <span className="text-[#F2F1EC]">{salaryLabel(job)}</span>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-2.5 border-b border-[#F2F1EC] pb-8">
        {pack ? (
          <div>
            <Link href={`/apply/${job.id}`} className="pill pill-sm">
              Open on your apply list
            </Link>
            {pack.state === "preparing" ? (
              <p className="mt-4 max-w-xl text-[15px] text-[rgba(242,241,236,0.6)]" aria-busy="true" aria-live="polite">
                <PreparingLine />
              </p>
            ) : null}
          </div>
        ) : (
          <JobActions jobId={job.id} allowSkip={job.status !== "skipped"} layout="detail" />
        )}
        {listing ? (
          <a
            href={listing.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto font-mono text-[11px] tracking-[0.1em] text-[rgba(242,241,236,0.55)] uppercase no-underline border-b border-[rgba(242,241,236,0.3)] pb-0.5 hover:text-[#FF6B5B]"
          >
            View on LinkedIn ↗
          </a>
        ) : null}
      </div>
      <div className="mt-10 max-w-[62ch]">
        {blocks.map((block, index) => {
          if (block.kind === "head") {
            return (
              <h3 key={index} className="mt-9 mb-3 font-[family-name:var(--font-bricolage)] text-[28px] font-bold tracking-[-0.01em]">
                {block.text}
              </h3>
            );
          }
          if (block.kind === "list") {
            return (
              <ul key={index} className="mb-[18px] flex list-disc flex-col gap-2 pl-[22px]">
                {block.items.map((item) => (
                  <li key={item} className="text-[18.5px] leading-[1.5] text-[rgba(242,241,236,0.85)]">
                    {item}
                  </li>
                ))}
              </ul>
            );
          }
          return (
            <p key={index} className="mb-[18px] text-[18.5px] leading-[1.55] text-[rgba(242,241,236,0.85)]">
              {block.text}
            </p>
          );
        })}
      </div>
    </article>
  );
}
