export type Role = "candidate" | "admin";

export type JobStatus =
  | "new"
  | "low_fit"
  | "shortlisted"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "skipped"
  | "filtered"
  | "expired";

export type WorkPattern = "remote" | "hybrid" | "on-site";
export type ContractType =
  | "permanent"
  | "fixed-term"
  | "contract"
  | "part-time"
  | "freelance";
export type SalaryPeriod = "year" | "day" | "hour";
export type SourceId = "linkedin" | "reed" | "jsearch";
export type LetterState = "draft" | "reviewed";
export type ApplyState = "preparing" | "ready" | "failed";

export type AllowedUser = {
  email: string;
  role: Role;
  name: string;
};

export type KeywordTier = {
  id: "core" | "adjacent" | "stretch";
  label: string;
  enabled: boolean;
  phrases: string[];
};

export type Settings = {
  tiers: KeywordTier[];
  homePostcode: string;
  radiusMiles: number;
  locations: { label: string; mode: "radius" | "remote" }[];
  contractTypes: Record<ContractType, boolean>;
  scoreThreshold: number;
  standingNotes: string;
  digestEnabled: boolean;
  disclaimerEnabled: boolean;
  disclaimerText: string;
  monthlySpendCeilingUsd: number;
};

export type CvVersion = {
  version: number;
  text: string;
  filename: string;
  uploadedAt: string;
};

export type Profile = {
  cvText: string;
  cvVersion: number;
  cvHistory: CvVersion[];
  linkedinSummary: string;
  personalStatement: string;
  phone: string;
  email: string;
  addressLines: string[];
  linkedinUrl: string;
  headline: string;
  updatedAt: string;
};

export type ProfileFile = {
  id: string;
  storagePath: string;
  filename: string;
  kind: "cv" | "certificate";
  version: number | null;
  uploadedAt: string;
  label: string;
};

export type SourceLink = {
  source: SourceId;
  url: string;
  publisher: string | null;
  demo: boolean;
};

export type Job = {
  id: string;
  dedupeKey: string;
  applicationKey: string;
  title: string;
  company: string;
  location: string;
  workPattern: WorkPattern;
  hybridDays: number | null;
  europeRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod | null;
  currency: string | null;
  contractType: ContractType;
  postedAt: string;
  closesAt: string | null;
  deadline: string | null;
  sources: SourceLink[];
  applyUrl: string | null;
  descriptionText: string;
  status: JobStatus;
  statusChangedAt: string;
  firstSeenAt: string;
  filteredReason: string | null;
  letterNotes: string;
  privateNote: string;
  demo: boolean;
};

export type FitAssessment = {
  id: string;
  jobId: string;
  model: string;
  promptVersion: string;
  score: number;
  summary: string;
  matches: string[];
  gaps: string[];
  blockers: string[];
  flags: string[];
  seniorityFit: string;
  locationFit: string;
  salaryNote: string;
  createdAt: string;
};

export type Letter = {
  id: string;
  jobId: string;
  version: number;
  model: string;
  configuredWritingModel: string;
  promptVersion: string;
  cvVersion: number;
  refLine: string;
  salutation: string;
  body: string[];
  signOff: string;
  notesForNigel: string;
  unsupportedClaims: string[];
  styleIssues: string[];
  wordCount: number;
  editedBody: string | null;
  disclaimerEnabled: boolean | null;
  state: LetterState;
  origin: "imported" | "generated";
  docxPath: string | null;
  createdAt: string;
};

export type Application = {
  id: string;
  jobId: string | null;
  company: string;
  title: string;
  applicationKey: string;
  appliedAt: string;
  outcome: string | null;
  outcomeAt: string | null;
};

export type StatusEvent = {
  id: string;
  jobId: string;
  from: JobStatus | null;
  to: JobStatus;
  at: string;
  by: string;
};

export type SourceCounts = {
  fetched: number;
  new: number;
  filtered: number;
  scored: number;
  letters: number;
  duplicates: number;
  alreadyApplied: number;
  practisingQualification: number;
  demo: boolean;
  error: string | null;
};

export type Run = {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  trigger: "cron" | "manual";
  by: string;
  lookbackHours: number;
  counts: Record<SourceId, SourceCounts>;
  totals: {
    fetched: number;
    new: number;
    filtered: number;
    scored: number;
    letters: number;
    worthALook: number;
  };
  errors: string[];
  warnings: string[];
  estimatedCostUsd: number;
  lettersSkippedReason: string | null;
  digestHtml: string | null;
  digestSent: boolean;
};

export type RawPayload = {
  id: string;
  runId: string;
  source: SourceId;
  externalId: string;
  payload: unknown;
  storedAt: string;
};

export type Session = {
  id: string;
  email: string;
  role: Role;
  name: string;
  createdAt: string;
  expiresAt: string;
};

export type MagicLink = {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
};

export type HowToApply = {
  steps: string[];
  url: string;
  asks: string[];
};

export type ApplyContact = {
  name: string | null;
  email: string | null;
  link: string | null;
  linkLabel: string | null;
  none: string | null;
};

export type CompanySource = {
  label: string;
  url: string;
};

export type SpecPoint = {
  want: string;
  show: string;
};

export type ApplyPack = {
  id: string;
  jobId: string;
  state: ApplyState;
  letterId: string | null;
  howToApply: HowToApply | string | null;
  contact: ApplyContact | string | null;
  companyNote: string | null;
  companySources: CompanySource[];
  lookingFor: SpecPoint[];
  liveResearch: boolean;
  model: string;
  error: string | null;
  createdAt: string;
  readyAt: string | null;
};

export type RunLock = {
  until: string;
  owner: string;
} | null;

export type Store = {
  allowedUsers: AllowedUser[];
  profile: Profile;
  profileFiles: ProfileFile[];
  settings: Settings;
  runs: Run[];
  rawJobs: RawPayload[];
  jobs: Job[];
  fitAssessments: FitAssessment[];
  letters: Letter[];
  applications: Application[];
  applyPacks: ApplyPack[];
  statusEvents: StatusEvent[];
  sessions: Session[];
  magicLinks: MagicLink[];
  runLock: RunLock;
};

export type RawJob = {
  source: SourceId;
  externalId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  listingUrl: string;
  applyUrl?: string | null;
  postedAt: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryPeriod?: SalaryPeriod | null;
  currency?: string | null;
  contractType?: ContractType | null;
  workPattern?: WorkPattern | null;
  hybridDays?: number | null;
  closesAt?: string | null;
  demo?: boolean;
  publisher?: string | null;
};

export type SearchParams = {
  phrases: string[];
  locations: Settings["locations"];
  radiusMiles: number;
  lookbackHours: number;
  contractTypes: ContractType[];
};
