import { contractLabel, patternLabel, postedLabel, salaryLabel, sourceLabel } from "./format";
import type { FitAssessment, Job, JobStatus, Letter } from "./types";

export type TodayCard = {
  id: string;
  title: string;
  company: string;
  location: string;
  pattern: string;
  salary: string;
  contract: string;
  posted: string;
  sources: { label: string; url: string }[];
  score: number | null;
  summary: string;
  blockers: string[];
  letter: "none" | "draft" | "reviewed";
  checkThis: boolean;
  demo: boolean;
  status: JobStatus;
  filteredReason: string | null;
};

export function toCard(job: Job, fit: FitAssessment | undefined, letter: Letter | undefined): TodayCard & { filteredReason: string | null } {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.europeRemote ? `${job.location} · Europe remote` : job.location,
    pattern: patternLabel(job.workPattern, job.hybridDays),
    salary: salaryLabel(job),
    contract: contractLabel(job.contractType),
    posted: postedLabel(job.postedAt),
    sources: job.sources.map((source) => ({
      label: sourceLabel(source.source, source.publisher) || (job.demo ? "Sample" : "Tracker"),
      url: source.url || "#",
    })),
    score: fit?.score ?? null,
    summary: fit?.summary || job.filteredReason || "Imported from the tracker.",
    blockers: fit?.blockers ?? [],
    letter: letter ? letter.state : "none",
    checkThis: Boolean(letter && (letter.unsupportedClaims.length || letter.styleIssues.length)),
    demo: job.demo,
    status: job.status,
    filteredReason: job.filteredReason,
  };
}
