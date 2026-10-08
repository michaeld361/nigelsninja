/** Short remarks for the Jobs page. One is chosen on each visit. */
export const JOBS_VISIT_LINES = [
  "Have a look when you have a minute.",
  "Something here might be worth a letter.",
  "The good ones are the ones that feel like you.",
  "Take your time. Nothing goes out until you say so.",
  "A quiet list, ready when you are.",
  "Open one if it looks like a fit.",
  "Your next conversation might already be here.",
  "See what turned up, and leave the rest.",
  "A letter only if you want to send one.",
  "Worth a glance before the day runs away.",
] as const;

export function pickJobsVisitLine(random: () => number = Math.random): string {
  const index = Math.floor(random() * JOBS_VISIT_LINES.length);
  return JOBS_VISIT_LINES[Math.min(JOBS_VISIT_LINES.length - 1, Math.max(0, index))] ?? JOBS_VISIT_LINES[0];
}
