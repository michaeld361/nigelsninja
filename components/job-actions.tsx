"use client";

import { useState, useTransition } from "react";
import { addToApplyList, skipJob } from "@/app/actions";
import { toast } from "sonner";

export function JobActions({
  jobId,
  allowSkip = true,
  layout = "row",
}: {
  jobId: string;
  allowSkip?: boolean;
  layout?: "row" | "detail";
}) {
  const [which, setWhich] = useState<"add" | "skip" | null>(null);
  const [pending, start] = useTransition();
  const stacked = layout === "row";

  return (
    <div className={stacked ? "flex w-full min-w-0 flex-col items-stretch gap-2 pt-1.5 sm:w-auto sm:items-end" : "flex max-w-full flex-wrap items-center gap-2.5"}>
      <button
        type="button"
        disabled={pending}
        className={stacked ? "pill pill-sm max-w-full whitespace-normal sm:whitespace-nowrap" : "pill max-w-full whitespace-normal sm:whitespace-nowrap"}
        onClick={() => {
          setWhich("add");
          start(async () => {
            const result = await addToApplyList(jobId);
            if (result && !result.ok) toast.error(result.message);
          });
        }}
      >
        {pending && which === "add" ? "Adding…" : "Add to apply list"}
      </button>
      {allowSkip ? (
        <button
          type="button"
          disabled={pending}
          className={stacked ? "skip-link" : "pill pill-line"}
          onClick={() => {
            setWhich("skip");
            start(async () => {
              const result = await skipJob(jobId);
              if (result && !result.ok) toast.error(result.message);
            });
          }}
        >
          {pending && which === "skip" ? "Skipping…" : "Skip"}
        </button>
      ) : null}
    </div>
  );
}
