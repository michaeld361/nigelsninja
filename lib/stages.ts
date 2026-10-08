export const APPLICATION_STAGES = ["applied", "interview", "offer", "rejected", "withdrawn"] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function isApplicationStage(status: string): status is ApplicationStage {
  return (APPLICATION_STAGES as readonly string[]).includes(status);
}
