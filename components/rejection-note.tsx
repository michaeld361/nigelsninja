"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveLearningReason, saveRejectionReason } from "@/app/actions";
import { formatLongDate } from "@/lib/text";
import { toast } from "sonner";

export function RejectionNote({
  jobId,
  learningId = null,
  reason,
  date,
}: {
  jobId?: string;
  learningId?: string | null;
  reason: string;
  date: string | null;
}) {
  const [text, setText] = useState(reason);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="mt-4 max-w-[52ch]"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = learningId ? await saveLearningReason(learningId, text) : await saveRejectionReason(jobId || "", text);
          if (!result.ok) toast.error(result.message);
          else {
            toast.success(result.message ?? "Saved");
            router.refresh();
          }
        });
      }}
    >
      <label className="block font-mono text-[11px] tracking-[0.08em] text-[rgba(242,241,236,0.55)] uppercase" htmlFor={`why-${learningId || jobId}`}>
        Why it was unsuccessful
      </label>
      <textarea
        id={`why-${learningId || jobId}`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        className="mt-2 w-full resize-y border-0 border-b border-[rgba(242,241,236,0.35)] bg-transparent px-0 py-2 text-[15px] leading-6 text-[#F2F1EC] outline-none focus:border-[#F2F1EC]"
      />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="pill pill-sm">
          {pending ? "Saving…" : "Save"}
        </button>
        {date ? <span className="font-mono text-[11px] tracking-[0.04em] text-[rgba(242,241,236,0.45)]">{formatLongDate(date)}</span> : null}
      </div>
    </form>
  );
}
