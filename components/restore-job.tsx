"use client";

import { useTransition } from "react";
import { restoreJob } from "@/app/actions";
import { toast } from "sonner";

export function RestoreJob({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="pill pill-line pill-sm mt-1.5 whitespace-nowrap"
      onClick={() =>
        start(async () => {
          const result = await restoreJob(jobId);
          if (result && !result.ok) toast.error(result.message);
        })
      }
    >
      {pending ? "Bringing it back…" : "Another look"}
    </button>
  );
}
