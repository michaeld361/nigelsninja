import type { Store } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

export function applyRetention(store: Store, now = Date.now()) {
  const rawCutoff = now - 30 * DAY;
  store.rawJobs = store.rawJobs.filter((raw) => new Date(raw.storedAt).getTime() >= rawCutoff);

  const filteredCutoff = now - 30 * DAY;
  const staleCutoff = now - 180 * DAY;
  const dropIds = new Set(
    store.jobs
      .filter((job) => {
        const seen = new Date(job.firstSeenAt).getTime();
        if (job.status === "filtered" && seen < filteredCutoff) return true;
        if ((job.status === "expired" || job.status === "skipped") && seen < staleCutoff) return true;
        return false;
      })
      .map((job) => job.id),
  );
  if (!dropIds.size) return;
  store.jobs = store.jobs.filter((job) => !dropIds.has(job.id));
  store.fitAssessments = store.fitAssessments.filter((fit) => !dropIds.has(fit.jobId));
  store.letters = store.letters.filter((letter) => !dropIds.has(letter.jobId));
  store.statusEvents = store.statusEvents.filter((event) => !dropIds.has(event.jobId));
}

export function expireListings(store: Store, now = Date.now()) {
  for (const job of store.jobs) {
    if (!job.closesAt) continue;
    if (!["new", "low_fit", "shortlisted"].includes(job.status)) continue;
    if (new Date(job.closesAt).getTime() > now) continue;
    const from = job.status;
    job.status = "expired";
    job.statusChangedAt = new Date(now).toISOString();
    store.statusEvents.push({
      id: `expire-${job.id}-${now}`,
      jobId: job.id,
      from,
      to: "expired",
      at: job.statusChangedAt,
      by: "system",
    });
  }
}
