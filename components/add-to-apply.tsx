"use client";

import { useTransition } from "react";
import { addToApplyList } from "@/app/actions";
import { toast } from "sonner";

export function AddToApply({ jobId, label = "Add to apply list" }: { jobId: string; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="font-serif text-xl text-primary underline decoration-primary/30 underline-offset-8 disabled:opacity-60"
      onClick={() =>
        start(async () => {
          const result = await addToApplyList(jobId);
          if (result && !result.ok) toast.error(result.message);
        })
      }
    >
      {pending ? "Adding…" : label}
    </button>
  );
}
