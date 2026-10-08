import Link from "next/link";
import { MarkApplied } from "@/components/mark-applied";
import { PreparingLine } from "@/components/preparing-line";
import { RefreshWhilePreparing } from "@/components/refresh-preparing";
import { isApplicationStage } from "@/lib/stages";
import { loadStore } from "@/lib/store";

export default function ApplyPage() {
  const store = loadStore();
  const live = Boolean(process.env.APIFY_TOKEN);
  const packs = [...store.applyPacks]
    .filter((pack) => {
      const job = store.jobs.find((item) => item.id === pack.jobId);
      if (!job || isApplicationStage(job.status)) return false;
      return live ? !job.demo : true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const preparing = packs.some((pack) => pack.state === "preparing");
  return (
    <div className="rise">
      <RefreshWhilePreparing preparing={preparing} />
      <h1 className="display text-[clamp(40px,11vw,56px)] sm:text-[clamp(64px,9vw,112px)]">To apply</h1>
      <p className="mt-7 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">
        Chosen, with a letter ready. Not sent yet.
      </p>
      <div className="mt-12 border-t border-[#F2F1EC]">
        {packs.length === 0 ? (
          <div className="py-14 font-[family-name:var(--font-bricolage)] text-[28px] font-bold text-[rgba(242,241,236,0.5)] italic">
            Nothing chosen yet. Add one from Jobs when you want a letter.
          </div>
        ) : (
          packs.map((pack, index) => {
            const job = store.jobs.find((item) => item.id === pack.jobId);
            if (!job) return null;
            const ready = pack.state === "ready";
            const preparingRow = pack.state === "preparing";
            return (
              <article
                key={pack.id}
                className="job-row grid w-full grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-b border-[rgba(242,241,236,0.12)] py-7 text-left text-[#F2F1EC] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center sm:gap-5"
              >
                <div className="pt-1 font-mono text-xs text-[rgba(242,241,236,0.45)] sm:pt-0">{String(index + 1).padStart(2, "0")}</div>
                <div className="min-w-0">
                  <Link href={`/apply/${job.id}`} className="block hover:text-[#FF6B5B]">
                    <div className="font-[family-name:var(--font-bricolage)] text-[32px] leading-none font-bold tracking-[-0.02em] break-words sm:text-[40px]">{job.company}</div>
                    <div className="mt-2 text-lg leading-snug break-words text-[#F2F1EC]">{job.title}</div>
                  </Link>
                  {preparingRow ? (
                    <div
                      className="mt-4 max-w-full min-w-0 overflow-hidden font-mono text-[11px] leading-[1.45] tracking-[0.1em] text-[#F2F1EC] uppercase"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <PreparingLine />
                    </div>
                  ) : (
                    <div className="mt-3 font-mono text-[11px] tracking-[0.1em] text-[rgba(242,241,236,0.55)] uppercase">
                      {ready ? "Letter ready" : "Needs another try"}
                    </div>
                  )}
                </div>
                <div className="col-start-2 sm:col-start-auto sm:self-center">
                  <MarkApplied jobId={job.id} />
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
