"use client";

import { useState, useTransition } from "react";
import { retryLetters, runNow } from "@/app/actions";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">Admin</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          LinkedIn is the live source. Reed and JSearch are still in the code for later. Nigel does not see this page.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => go("linkedin")}>{pending ? "Looking…" : "Look on LinkedIn"}</Button>
        <Button
          variant="secondary"
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
        </Button>
      </div>
      <p className="text-sm">
        Spend this month ${spend.toFixed(2)} of ${ceiling.toFixed(0)} ceiling.
        {spend >= ceiling ? " The ceiling is reached, so new runs score roles and skip letters." : ""}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {keys.map((key) => (
          <li key={key.name} className="rounded-xl border px-3 py-2 text-sm">
            {key.name}: {key.set ? "set" : "missing"}
          </li>
        ))}
      </ul>
      {runs.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-4 py-8 text-sm text-muted-foreground">No runs yet. Run now fetches the three sources. Without API keys it uses labelled sample listings.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Trigger</th>
                <th className="px-3 py-2 font-medium">Fetched</th>
                <th className="px-3 py-2 font-medium">New</th>
                <th className="px-3 py-2 font-medium">Letters</th>
                <th className="px-3 py-2 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <button type="button" className="underline" onClick={() => setOpen(run.id)}>
                      {new Date(run.startedAt).toLocaleString("en-GB", { timeZone: "Europe/London" })}
                    </button>
                  </td>
                  <td className="px-3 py-2">{run.trigger}</td>
                  <td className="px-3 py-2">{run.totals.fetched}</td>
                  <td className="px-3 py-2">{run.totals.new}</td>
                  <td className="px-3 py-2">{run.totals.letters}</td>
                  <td className="px-3 py-2">${run.estimatedCostUsd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {latest ? (
        <section className="space-y-2 rounded-2xl border p-4 text-sm">
          <h2 className="font-medium">Run detail</h2>
          {(["linkedin", "reed", "jsearch"] as const).map((source) => (
            <p key={source}>
              {source}: fetched {latest.counts[source].fetched}, new {latest.counts[source].new}, filtered {latest.counts[source].filtered}, scored {latest.counts[source].scored}, letters {latest.counts[source].letters}, duplicates {latest.counts[source].duplicates}, already applied {latest.counts[source].alreadyApplied}
              {latest.counts[source].demo ? " (sample)" : ""}
              {latest.counts[source].error ? ` Error: ${latest.counts[source].error}` : ""}
            </p>
          ))}
          {latest.warnings.map((warning) => (
            <p key={warning} className="text-amber-700 dark:text-amber-300">{warning}</p>
          ))}
          {latest.lettersSkippedReason ? <p>{latest.lettersSkippedReason}</p> : null}
          {latest.digestHtml ? (
            <div>
              <p className="font-medium">Digest {latest.digestSent ? "sent" : "preview, not emailed"}</p>
              <div className="prose mt-2 max-w-none text-sm" dangerouslySetInnerHTML={{ __html: latest.digestHtml }} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
