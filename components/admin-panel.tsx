"use client";

import { useState, useTransition } from "react";
import { retryLetters, runNow } from "@/app/actions";
import type { Run } from "@/lib/types";
import { toast } from "sonner";

export function AdminPanel({
  runs,
  spend,
  ceiling,
  keys,
}: {
  runs: Run[];
  spend: number;
  ceiling: number;
  keys: { name: string; set: boolean }[];
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(runs[0]?.id ?? null);
  const latest = runs.find((run) => run.id === open) ?? runs[0];

  function go(source?: "linkedin" | "reed" | "jsearch") {
    start(async () => {
      const result = await runNow(source);
      if (!result.ok) toast.error(result.message);
      else toast.success(result.message ?? "Run finished");
    });
  }

  const width = ceiling > 0 ? Math.min(100, (spend / ceiling) * 100) : 0;
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  return (
    <div className="rise">
      <div className="eyebrow">Admin · Nigel does not see this page</div>
      <h1 className="display mt-3.5 text-[clamp(40px,11vw,56px)] break-words sm:text-[clamp(64px,9vw,112px)]">Engine room</h1>
      <p className="mt-7 max-w-[52ch] text-xl leading-[1.45] text-[rgba(242,241,236,0.7)]">
        LinkedIn is the live source. Reed and JSearch are still in the code for later.
      </p>
      <div className="mt-8 flex flex-wrap gap-2.5">
        <button type="button" className="pill max-w-full whitespace-normal sm:whitespace-nowrap" disabled={pending} onClick={() => go("linkedin")}>
          {pending ? "Looking…" : "Look on LinkedIn"}
        </button>
        <button
          type="button"
          className="pill pill-line max-w-full whitespace-normal sm:whitespace-nowrap"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await retryLetters();
              if (!result.ok) toast.error(result.message);
              else toast.success(result.message ?? "Done");
            })
          }
        >
          Retry missing letters
        </button>
      </div>

      <section className="mt-14 grid grid-cols-1 items-start gap-8 border-t border-[#F2F1EC] pt-6 md:grid-cols-[minmax(140px,180px)_minmax(0,1fr)]">
        <h2 className="font-[family-name:var(--font-bricolage)] text-2xl leading-[1.1] font-bold tracking-[-0.01em]">Spend</h2>
        <div>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-[family-name:var(--font-bricolage)] text-[40px] leading-none font-bold tracking-[-0.02em] sm:text-[56px]">${spend.toFixed(2)}</span>
            <span className="font-mono text-xs text-[rgba(242,241,236,0.55)]">of ${ceiling.toFixed(0)} ceiling this month</span>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-sm bg-[rgba(242,241,236,0.08)]">
            <div className="bar-grow h-full min-w-1.5 bg-[#FF6B5B]" style={{ width: `${Math.max(width, spend > 0 ? 1.4 : 0)}%` }} />
          </div>
          {spend >= ceiling ? <p className="mt-3 text-sm text-[#B3261E]">The ceiling is reached, so new runs score roles and skip letters.</p> : null}
        </div>
      </section>

      <section className="mt-14 grid grid-cols-1 items-start gap-8 border-t border-[#F2F1EC] pt-6 md:grid-cols-[minmax(140px,180px)_minmax(0,1fr)]">
        <h2 className="font-[family-name:var(--font-bricolage)] text-2xl leading-[1.1] font-bold tracking-[-0.01em]">Keys</h2>
        <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {keys.map((key) => (
            <div key={key.name} className="flex items-center justify-between border-b border-[rgba(242,241,236,0.1)] py-3 font-mono text-xs">
              <span>{key.name}</span>
              <span className="flex items-center gap-2 text-[11px] tracking-[0.08em] text-[#FF6B5B] uppercase">
                <span className="inline-block size-[7px] rounded-full bg-[#FF6B5B]" />
                {key.set ? "set" : "missing"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 grid grid-cols-1 items-start gap-8 border-t border-[#F2F1EC] pt-6 md:grid-cols-[minmax(140px,180px)_minmax(0,1fr)]">
        <h2 className="font-[family-name:var(--font-bricolage)] text-2xl leading-[1.1] font-bold tracking-[-0.01em]">Runs</h2>
        <div>
          {runs.length === 0 ? (
            <p className="text-[17px] text-[rgba(242,241,236,0.7)]">No runs yet. Look on LinkedIn to fetch live roles. Without a key it uses labelled sample listings.</p>
          ) : (
            <div className="flex flex-col md:hidden">
              {runs.map((run) => {
                const selected = latest?.id === run.id;
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setOpen(run.id)}
                    className="border-b border-[rgba(242,241,236,0.1)] bg-transparent py-3.5 text-left font-mono text-[12.5px] hover:text-[#FF6B5B]"
                    style={{ color: selected ? "#F2F1EC" : "rgba(242,241,236,.55)" }}
                  >
                    <span className="block">{when(run.startedAt)}</span>
                    <span className="mt-1 block text-[11px] tracking-[0.06em] uppercase">{run.trigger}</span>
                    <span className="mt-2 block text-[11px] text-[rgba(242,241,236,0.55)]">
                      Fetched {run.totals.fetched} · New {run.totals.new} · Letters {run.totals.letters} · ${run.estimatedCostUsd.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <div className="grid min-w-[640px] grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))] gap-3 border-b border-[rgba(242,241,236,0.12)] pb-2.5 font-mono text-[10.5px] tracking-[0.1em] text-[rgba(242,241,236,0.5)] uppercase">
                <span>When</span>
                <span>Trigger</span>
                <span className="text-right">Fetched</span>
                <span className="text-right">New</span>
                <span className="text-right">Letters</span>
                <span className="text-right">Cost</span>
              </div>
              {runs.map((run) => {
                const selected = latest?.id === run.id;
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setOpen(run.id)}
                    className="grid min-w-[640px] w-full grid-cols-[minmax(0,1.6fr)_repeat(5,minmax(0,1fr))] gap-3 border-b border-[rgba(242,241,236,0.1)] bg-transparent py-3.5 text-left font-mono text-[12.5px] hover:text-[#FF6B5B]"
                    style={{ color: selected ? "#F2F1EC" : "rgba(242,241,236,.55)" }}
                  >
                    <span className="whitespace-nowrap">{when(run.startedAt)}</span>
                    <span>{run.trigger}</span>
                    <span className="text-right">{run.totals.fetched}</span>
                    <span className="text-right">{run.totals.new}</span>
                    <span className="text-right">{run.totals.letters}</span>
                    <span className="text-right">${run.estimatedCostUsd.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {latest ? (
            <div className="mt-8 bg-[#F2F1EC] p-5 font-mono text-[12.5px] leading-[1.7] break-words text-[#0E0F11] sm:p-7">
              <div className="mb-3 text-[10.5px] tracking-[0.14em] text-[rgba(14,15,17,0.5)] uppercase">Run detail · {when(latest.startedAt)}</div>
              {(["linkedin", "reed", "jsearch"] as const).map((source) => (
                <div key={source} className={source === "linkedin" ? undefined : "text-[rgba(14,15,17,0.5)]"}>
                  {source} · fetched {latest.counts[source].fetched} · new {latest.counts[source].new} · filtered {latest.counts[source].filtered} · scored {latest.counts[source].scored} · letters {latest.counts[source].letters} · duplicates {latest.counts[source].duplicates} · already applied {latest.counts[source].alreadyApplied}
                  {latest.counts[source].demo ? " · sample" : ""}
                  {latest.counts[source].error ? ` · ${latest.counts[source].error}` : ""}
                </div>
              ))}
              {latest.warnings.map((warning) => (
                <div key={warning} className="mt-4 border border-[rgba(179,38,30,0.4)] px-4 py-3.5 text-[#B3261E]">
                  {warning}
                </div>
              ))}
              {latest.lettersSkippedReason ? <div className="mt-4">{latest.lettersSkippedReason}</div> : null}
              {latest.digestHtml ? (
                <div className="mt-4">
                  <div className="text-[10.5px] tracking-[0.14em] text-[rgba(14,15,17,0.5)] uppercase">
                    Digest {latest.digestSent ? "sent" : "preview, not emailed"}
                  </div>
                  <div className="mt-2 font-sans text-[17px] leading-[1.5]" dangerouslySetInnerHTML={{ __html: latest.digestHtml }} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
