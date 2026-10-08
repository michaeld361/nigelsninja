import { dedupeKey, inferContract, inferWorkPattern, parseSalary, applicationKey } from "@/lib/text";
import type { Job, RawJob, WorkPattern } from "@/lib/types";

export function normaliseRaw(raw: RawJob, now = new Date().toISOString()): Omit<Job, "id" | "status" | "statusChangedAt" | "filteredReason" | "letterNotes" | "privateNote" | "deadline"> & {
  europeRemote: boolean;
} {
  const blob = `${raw.location}\n${raw.description}`;
  const pattern = raw.workPattern
    ? { workPattern: raw.workPattern, hybridDays: raw.hybridDays ?? null }
    : inferWorkPattern(blob);
  const salary = parseSalary(raw.description);
  const contractType = raw.contractType ?? inferContract(`${raw.title}\n${raw.description}`);
  const workPattern: WorkPattern = pattern.workPattern;
  return {
    dedupeKey: dedupeKey(raw.company, raw.title, raw.location, workPattern),
    applicationKey: applicationKey(raw.company, raw.title),
    title: raw.title.trim(),
    company: raw.company.trim(),
    location: raw.location.trim(),
    workPattern,
    hybridDays: pattern.hybridDays,
    europeRemote: false,
    salaryMin: salary.salaryMin,
    salaryMax: salary.salaryMax,
    salaryPeriod: salary.salaryPeriod,
    currency: salary.currency,
    contractType,
    postedAt: raw.postedAt,
    closesAt: raw.closesAt ?? null,
    sources: [
      {
        source: raw.source,
        url: raw.listingUrl,
        publisher: raw.publisher ?? null,
        demo: Boolean(raw.demo),
      },
    ],
    applyUrl: raw.applyUrl ?? raw.listingUrl,
    descriptionText: raw.description.trim(),
    firstSeenAt: now,
    demo: Boolean(raw.demo),
  };
}

export function withinLookback(postedAt: string, lookbackHours: number, now = Date.now()): boolean {
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return false;
  return now - posted <= lookbackHours * 60 * 60 * 1000;
}
