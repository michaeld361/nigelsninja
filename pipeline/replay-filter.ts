import type { Store } from "@/lib/types";
import { prefilterJob } from "./prefilter";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Re-apply the prefilter to filtered rows from the last seven days. No source fetch. Roles that now pass wait to be scored. */
export function replayFiltered(store: Store, now = Date.now()): { released: number; kept: number } {
  let released = 0;
  let kept = 0;
  const at = new Date(now).toISOString();
  for (const job of store.jobs) {
    if (job.status !== "filtered") continue;
    if (now - new Date(job.firstSeenAt).getTime() > WEEK) continue;
    const gate = prefilterJob(
      {
        title: job.title,
        location: job.location,
        workPattern: job.workPattern,
        contractType: job.contractType,
        description: job.descriptionText,
      },
      store.settings,
    );
    if (!gate.keep) {
      job.filteredReason = gate.reason;
      kept += 1;
      continue;
    }
    job.status = "unscored";
    job.filteredReason = null;
    job.europeRemote = gate.europeRemote;
    job.statusChangedAt = at;
    store.statusEvents.push({
      id: `replay-${job.id}-${now}`,
      jobId: job.id,
      from: "filtered",
      to: "unscored",
      at,
      by: "prefilter",
    });
    released += 1;
  }
  return { released, kept };
}

/** Contract and day-rate stay on. A three-month contract is fixed-term, and a day rate is contract. */
export function ensureContractTypes(store: Store): boolean {
  let changed = false;
  for (const key of ["contract", "freelance", "fixed-term"] as const) {
    if (!store.settings.contractTypes[key]) {
      store.settings.contractTypes[key] = true;
      changed = true;
    }
  }
  return changed;
}
