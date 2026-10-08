"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { regenerateApplyPack } from "@/app/actions";

export function RegeneratePage({ jobId, readyAt }: { jobId: string; readyAt: string | null }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const seen = useRef(readyAt);

  useEffect(() => {
    if (!working) return;
    if (readyAt !== seen.current) {
      setWorking(false);
      return;
    }
    const handle = setInterval(() => router.refresh(), 1500);
    return () => clearInterval(handle);
  }, [working, readyAt, router]);

  return (
    <div className="mt-8">
      <button
        type="button"
        className={`pill pill-sm${working ? " is-searching" : ""}`}
        disabled={working}
        aria-busy={working}
        aria-pressed={working}
        onClick={() => {
          if (working) return;
          seen.current = readyAt;
          setWorking(true);
          void (async () => {
            const result = await regenerateApplyPack(jobId);
            if (!result.ok) {
              setWorking(false);
              toast.error(result.message);
              return;
            }
            router.refresh();
          })();
        }}
      >
        {working ? "Regenerating…" : "Regenerate"}
      </button>
    </div>
  );
}
