const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

export function alreadyAppliedMatch(input: {
  postingId: string;
  applicationKey: string;
  now: number;
  jobs: { id: string; status: string; applicationKey: string; statusChangedAt: string }[];
  applications: { applicationKey: string; appliedAt: string }[];
}): boolean {
  if (input.jobs.some((job) => job.id === input.postingId && job.status === "applied")) return true;
  const cutoff = input.now - NINETY_DAYS;
  const recent = (iso: string) => {
    const time = new Date(iso).getTime();
    return Number.isFinite(time) && time >= cutoff;
  };
  if (input.applications.some((item) => item.applicationKey === input.applicationKey && recent(item.appliedAt))) return true;
  return input.jobs.some(
    (job) => job.status === "applied" && job.applicationKey === input.applicationKey && recent(job.statusChangedAt),
  );
}
