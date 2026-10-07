"use client";

import { useState, useTransition } from "react";
import { addToApplyList, skipJob } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function JobActions({ jobId, allowSkip = true }: { jobId: string; allowSkip?: boolean }) {
  const [which, setWhich] = useState<"add" | "skip" | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        disabled={pending}
        className="h-auto rounded-full px-5 py-2 font-serif text-base"
        onClick={() => {
          setWhich("add");
          start(async () => {
            const result = await addToApplyList(jobId);
            if (result && !result.ok) toast.error(result.message);
          });
        }}
      >
        {pending && which === "add" ? "Adding…" : "Add to apply list"}
      </Button>
      {allowSkip ? (
        <Button
          type="button"
          disabled={pending}
          className="h-auto rounded-full bg-[#8d3b36] px-5 py-2 font-serif text-base text-[#f7f3ec] hover:bg-[#7a322e]"
          onClick={() => {
            setWhich("skip");
            start(async () => {
              const result = await skipJob(jobId);
              if (result && !result.ok) toast.error(result.message);
            });
          }}
        >
          {pending && which === "skip" ? "Skipping…" : "Skip"}
        </Button>
      ) : null}
    </div>
  );
}
