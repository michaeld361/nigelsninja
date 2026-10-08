import { isApplicationStage } from "./stages";
import type { Store } from "./types";

/** Puts To apply, Applied, and Skipped back on Jobs, and drops the two test notes. Listings, the CV, and search settings stay. */
export function clearDemoSelections(store: Store, now = new Date().toISOString()): { returned: number; notes: number; learnings: number } {
  if (!store.jobs) store.jobs = [];
  if (!store.applyPacks) store.applyPacks = [];
  if (!store.applications) store.applications = [];
  if (!store.notes) store.notes = [];
  if (!store.learnings) store.learnings = [];

  const returning = new Set<string>();
  for (const job of store.jobs) {
    if (job.status === "skipped" || isApplicationStage(job.status)) {
      job.status = "new";
      job.statusChangedAt = now;
      returning.add(job.id);
    }
  }
  for (const pack of store.applyPacks) returning.add(pack.jobId);
  store.applyPacks = [];

  const keys = new Set(store.jobs.filter((job) => returning.has(job.id)).map((job) => job.applicationKey));
  store.applications = store.applications.filter((item) => {
    if (item.jobId && returning.has(item.jobId)) return false;
    return !keys.has(item.applicationKey);
  });

  const notesBefore = store.notes.length;
  store.notes = store.notes.filter((note) => note.text.trim().toLowerCase() !== "testing");
  const learningsBefore = store.learnings.length;
  store.learnings = store.learnings.filter((item) => item.reason.trim().toLowerCase() !== "rejection test");

  return {
    returned: returning.size,
    notes: notesBefore - store.notes.length,
    learnings: learningsBefore - store.learnings.length,
  };
}
