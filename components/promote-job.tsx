"use client";

import { useTransition } from "react";
import { setJobStatus } from "@/app/actions";
import { toast } from "sonner";

export function PromoteJob({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="pill pill-sm max-w-full whitespace-normal"
      onClick={() => {
        startTransition(async () => {
          const result = await setJobStatus(jobId, "new");
          if (result && !result.ok) toast.error(result.message);
        });
      }}
    >
      {pending ? "Moving…" : "Move to Jobs"}
    </button>
  );
}
