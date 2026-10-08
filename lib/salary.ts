import { parseSalary } from "./text";
import type { Job, Store } from "./types";

/** Keeps a salary only when the posting text states the figure. Scraper fields are ignored. */
export function groundJobSalary(job: Pick<Job, "descriptionText" | "salaryMin" | "salaryMax" | "salaryPeriod" | "currency">): boolean {
  const stated = parseSalary(job.descriptionText || "");
  const empty = stated.salaryMin == null && stated.salaryMax == null;
  const next = {
    salaryMin: stated.salaryMin,
    salaryMax: stated.salaryMax,
    salaryPeriod: empty ? null : stated.salaryPeriod,
    currency: empty ? null : stated.currency,
  };
  const changed =
    job.salaryMin !== next.salaryMin ||
    job.salaryMax !== next.salaryMax ||
    job.salaryPeriod !== next.salaryPeriod ||
    job.currency !== next.currency;
  job.salaryMin = next.salaryMin;
  job.salaryMax = next.salaryMax;
  job.salaryPeriod = next.salaryPeriod;
  job.currency = next.currency;
  return changed;
}

export function groundStoredPay(store: Pick<Store, "jobs" | "fitAssessments">): number {
  let changed = 0;
  for (const job of store.jobs) {
    if (groundJobSalary(job)) changed += 1;
  }
  for (const fit of store.fitAssessments) {
    const job = store.jobs.find((item) => item.id === fit.jobId);
    if (!job || job.salaryMin != null || job.salaryMax != null) continue;
    if (!fit.salaryNote || /no salary/i.test(fit.salaryNote)) continue;
    if (!/[$£]|\d/.test(fit.salaryNote)) continue;
    fit.salaryNote = "No salary or day rate is stated.";
    changed += 1;
  }
  return changed;
}
