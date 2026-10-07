"use client";

import { useTransition } from "react";
import { retryApplyPack } from "@/app/actions";
import { toast } from "sonner";

export function ApplyActions({
  jobId,
  letterText,
  letterId,
  retry = false,
}: {
  jobId: string;
  letterText: string;
  letterId: string | null;
  retry?: boolean;
}) {
  const [pending, start] = useTransition();
  if (retry) {
    return (
      <button
        type="button"
        disabled={pending}
        className="font-serif text-xl text-primary underline decoration-primary/30 underline-offset-8"
        onClick={() =>
          start(async () => {
            const result = await retryApplyPack(jobId);
            if (!result.ok) toast.error(result.message);
          })
        }
      >
        {pending ? "Trying again…" : "Try again"}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap gap-6 text-sm">
      <button
        type="button"
        className="underline"
        onClick={async () => {
          await navigator.clipboard.writeText(letterText);
          toast.success("Letter copied");
        }}
      >
        Copy letter
      </button>
      {letterId ? (
        <a className="underline" href={`/api/letters/${letterId}/docx`}>
          Download .docx
        </a>
      ) : null}
    </div>
  );
}
