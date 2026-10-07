import Link from "next/link";
import { PreparingLine } from "@/components/preparing-line";
import { RefreshWhilePreparing } from "@/components/refresh-preparing";
import { loadStore } from "@/lib/store";

export default function ApplyPage() {
  const store = loadStore();
  const packs = [...store.applyPacks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const preparing = packs.some((pack) => pack.state === "preparing");
  return (
    <div className="rise">
      <RefreshWhilePreparing preparing={preparing} />
      <div className="eyebrow">Apply list · {packs.length} {packs.length === 1 ? "role" : "roles"}</div>
      <h1 className="display mt-3.5 text-[clamp(40px,11vw,56px)] sm:text-[clamp(64px,9vw,112px)]">Going for</h1>
      <p className="mt-7 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">
        The roles you have chosen. Open one for the letter, what they want to see, and how to send it.
      </p>
      <div className="mt-12 border-t border-[#F2F1EC]">
        {packs.length === 0 ? (
          <div className="py-14 font-[family-name:var(--font-bricolage)] text-[28px] font-bold text-[rgba(242,241,236,0.5)] italic">
            Your list is clear. When a role feels right, add it from Jobs and a letter will be drawn up.
          </div>
        ) : (
          packs.map((pack, index) => {
            const job = store.jobs.find((item) => item.id === pack.jobId);
            if (!job) return null;
            const ready = pack.state === "ready";
            const preparingRow = pack.state === "preparing";
            return (
              <Link
                key={pack.id}
                href={`/apply/${job.id}`}
                className={
                  preparingRow
                    ? "job-row grid w-full grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-b border-[rgba(242,241,236,0.12)] py-7 text-left text-[#F2F1EC] hover:text-[#FF6B5B] sm:gap-x-5"
                    : "job-row grid w-full grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 border-b border-[rgba(242,241,236,0.12)] py-7 text-left text-[#F2F1EC] hover:text-[#FF6B5B] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center sm:gap-5"
                }
              >
                <div className="pt-1 font-mono text-xs text-[rgba(242,241,236,0.45)] sm:pt-0">{String(index + 1).padStart(2, "0")}</div>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-[family-name:var(--font-bricolage)] text-[32px] leading-none font-bold tracking-[-0.02em] break-words sm:text-[40px]">{job.company}</div>
                      <div className="mt-2 text-lg leading-snug break-words text-[#F2F1EC]">{job.title}</div>
                    </div>
                    {preparingRow ? <span className="shrink-0 pt-1 font-mono text-sm">→</span> : null}
                  </div>
                  {preparingRow ? (
                    <div
                      className="mt-4 max-w-full min-w-0 overflow-hidden font-mono text-[11px] leading-[1.45] tracking-[0.1em] text-[#F2F1EC] uppercase"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <PreparingLine />
                    </div>
                  ) : null}
                </div>
                {preparingRow ? null : (
                  <div className="col-start-2 flex items-center gap-2.5 font-mono text-[11px] tracking-[0.1em] text-[#F2F1EC] uppercase sm:col-start-auto sm:self-center">
                    {ready ? <span className="inline-block size-2 shrink-0 rounded-full bg-[#FF6B5B]" /> : null}
                    {pack.state === "failed" ? "Needs another try" : "Ready"}
                    <span className="ml-1.5 text-sm">→</span>
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
