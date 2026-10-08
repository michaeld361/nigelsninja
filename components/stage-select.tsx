"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setApplicationStage } from "@/app/actions";
import { APPLICATION_STAGES, STAGE_LABEL, type ApplicationStage } from "@/lib/stages";
import { toast } from "sonner";

export function StageSelect({ jobId, stage }: { jobId: string; stage: ApplicationStage }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <label className="inline-flex max-w-full items-center">
      <span className="sr-only">Stage</span>
      <select
        aria-label="Stage"
        className="stage-select"
        disabled={pending}
        value={stage}
        onChange={(event) => {
          const next = event.target.value as ApplicationStage;
          start(async () => {
            const result = await setApplicationStage(jobId, next);
            if (!result.ok) toast.error(result.message);
            else router.refresh();
          });
        }}
      >
        {APPLICATION_STAGES.map((item) => (
          <option key={item} value={item}>
            {STAGE_LABEL[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
