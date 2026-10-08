"use client";

import { useState, useTransition, type FormEvent } from "react";
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
  const saved = reason.trim().length > 0;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reason);
  const [pending, start] = useTransition();
  const router = useRouter();
  const fieldId = `why-${learningId || jobId}`;

  function save(event: FormEvent) {
    event.preventDefault();
    start(async () => {
      const result = learningId ? await saveLearningReason(learningId, text) : await saveRejectionReason(jobId || "", text);
      if (!result.ok) toast.error(result.message);
      else {
        setEditing(false);
        toast.success(result.message ?? "Saved");
        router.refresh();
      }
    });
  }

  if (saved && !editing) {
    return (
      <div className="mt-3 max-w-[52ch]">
        <p className="text-[17px] leading-7 text-[#F2F1EC]">{reason}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {date ? <span className="font-mono text-[11px] tracking-[0.04em] text-[rgba(242,241,236,0.45)]">{formatLongDate(date)}</span> : null}
          <button type="button" className="skip-link" onClick={() => { setText(reason); setEditing(true); }}>
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="mt-4 max-w-[52ch]" onSubmit={save}>
      <label className="block font-mono text-[11px] tracking-[0.08em] text-[rgba(242,241,236,0.55)] uppercase" htmlFor={fieldId}>
        Why it was unsuccessful
      </label>
      <textarea
        id={fieldId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        className="mt-2 w-full resize-y border-0 border-b border-[rgba(242,241,236,0.35)] bg-transparent px-0 py-2 text-[15px] leading-6 text-[#F2F1EC] outline-none focus:border-[#F2F1EC]"
      />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="pill pill-sm">
          {pending ? "Saving…" : "Save"}
        </button>
        {saved ? (
          <button
            type="button"
            className="skip-link"
            onClick={() => {
              setText(reason);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
