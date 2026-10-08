"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markApplied } from "@/app/actions";
import { toast } from "sonner";

export function MarkApplied({ jobId, goTo }: { jobId: string; goTo?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      className="pill pill-sm max-w-full whitespace-normal sm:whitespace-nowrap"
      onClick={() =>
        start(async () => {
          const result = await markApplied(jobId);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          if (goTo) router.push(goTo);
          else router.refresh();
        })
      }
    >
      {pending ? "Moving…" : "Applied"}
    </button>
  );
}
