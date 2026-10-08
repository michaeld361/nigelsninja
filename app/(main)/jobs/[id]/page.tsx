import Link from "next/link";
import { JobActions } from "@/components/job-actions";
import { MissingJob } from "@/components/missing-job";
import { PreparingLine } from "@/components/preparing-line";
import { RejectionNote } from "@/components/rejection-note";
import { StageSelect } from "@/components/stage-select";
import { listingBlocks, listingDateShort, salaryLabel } from "@/lib/format";
import { isApplicationStage } from "@/lib/stages";
import { loadStore } from "@/lib/store";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = loadStore();
  const job = store.jobs.find((item) => item.id === id);
  if (!job) return <MissingJob />;
  const pack = store.applyPacks.find((item) => item.jobId === job.id);
  const listing = job.sources.find((source) => source.source === "linkedin") ?? job.sources[0];
  const stage = isApplicationStage(job.status) ? job.status : null;
  const back = stage ? { href: "/applied", label: "Applied" } : job.status === "skipped" ? { href: "/skipped", label: "Skipped" } : pack ? { href: "/apply", label: "To apply" } : { href: "/jobs", label: "Jobs" };
  const date = listingDateShort(job.postedAt);
  const pay = salaryLabel(job);
  const blocks = listingBlocks(job.descriptionText);
  return (
    <article className="rise">
      <Link href={back.href} className="eyebrow tracking-[0.12em] hover:text-[#FF6B5B]">
        ← {back.label}
      </Link>
      <h1 className="display mt-7 text-[clamp(36px,10vw,44px)] leading-[0.98] break-words sm:text-[clamp(44px,6vw,72px)]">{job.title}</h1>
      <div className="mt-3.5 text-[22px]">{job.company}</div>
      <div className="mt-2.5 font-mono text-[11.5px] tracking-[0.02em] text-[rgba(242,241,236,0.55)]">
        {job.location}
        {date ? ` · ${date}` : ""}
        {job.demo ? " · Sample" : ""}
        {pay ? <span className="text-[#F2F1EC]"> · {pay}</span> : null}
      </div>
      <div className="mt-8 flex flex-wrap items-start gap-x-4 gap-y-3 border-b border-[#F2F1EC] pb-8 sm:items-center">
        {stage ? (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
            <StageSelect jobId={job.id} stage={stage} />
            {pack ? (
              <Link href={`/apply/${job.id}`} className="pill pill-line pill-sm">
                Letter
              </Link>
            ) : null}
          </div>
        ) : pack ? (
          <div className="min-w-0 max-w-full">
            <Link href={`/apply/${job.id}`} className="pill pill-sm">
              Open on To apply
            </Link>
            {pack.state === "preparing" ? (
              <p className="mt-4 max-w-xl overflow-hidden font-mono text-[11px] leading-[1.45] tracking-[0.1em] text-[rgba(242,241,236,0.7)] uppercase" aria-busy="true" aria-live="polite">
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
            className="max-w-full border-b border-[rgba(242,241,236,0.3)] pb-0.5 font-mono text-[11px] tracking-[0.1em] break-all text-[rgba(242,241,236,0.55)] uppercase no-underline hover:text-[#FF6B5B] sm:ml-auto sm:break-normal"
          >
            View on LinkedIn ↗
          </a>
        ) : null}
      </div>
      {stage === "rejected" ? (
        <RejectionNote
          jobId={job.id}
          reason={store.learnings.find((item) => item.jobId === job.id)?.reason ?? ""}
          date={store.learnings.find((item) => item.jobId === job.id)?.at ?? null}
        />
      ) : null}
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
