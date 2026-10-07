import { SCORE_PROMPT_VERSION } from "@/lib/defaults";
import { titleMatchesPhrase } from "@/lib/text";
import type { FitAssessment, Settings } from "@/lib/types";
import { callClaude, extractJson } from "./llm";
import { z } from "zod";

const ScoreSchema = z.object({
  score: z.number(),
  summary: z.string(),
  matches: z.array(z.string()),
  gaps: z.array(z.string()),
  blockers: z.array(z.string()),
  seniority_fit: z.string(),
  location_fit: z.string(),
  salary_note: z.string(),
});

export type ScoreInput = {
  title: string;
  company: string;
  location: string;
  workPattern: string;
  europeRemote: boolean;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: string | null;
  currency: string | null;
  contractType: string;
};

export type ScoreResult = {
  score: number;
  summary: string;
  matches: string[];
  gaps: string[];
  blockers: string[];
  flags: string[];
  seniorityFit: string;
  locationFit: string;
  salaryNote: string;
  model: string;
  promptVersion: string;
};

const HAVE = [
  { label: "UK and EU GDPR", keys: ["gdpr"] },
  { label: "PECR", keys: ["pecr"] },
  { label: "DPIAs and privacy assessments", keys: ["dpia", "impact assessment", "pia"] },
  { label: "Records of processing", keys: ["ropa", "record of processing", "records of processing"] },
  { label: "Vendor due diligence and DPAs", keys: ["vendor", "due diligence", "supplier", "dpa"] },
  { label: "DSARs and data subject rights", keys: ["dsar", "subject access", "data subject"] },
  { label: "International transfers (SCCs and IDTAs)", keys: ["scc", "idta", "transfer", "cross-border"] },
  { label: "Privacy training", keys: ["training", "awareness"] },
  { label: "OneTrust", keys: ["onetrust", "one trust"] },
  { label: "Microsoft Purview", keys: ["purview"] },
  { label: "Master data management", keys: ["master data", "mdm", "stewardship"] },
  { label: "ISO 27001 or ISO 27701", keys: ["iso 27001", "iso27001", "iso 27701", "iso27701"] },
  { label: "AI governance", keys: ["ai governance", "artificial intelligence"] },
  { label: "M&A and divestiture privacy", keys: ["m&a", "merger", "acquisition", "divest"] },
];

const LACK = [
  { label: "Qualified solicitor", keys: ["qualified solicitor", "practising solicitor", "practicing solicitor", "qualified lawyer"] },
  { label: "Security clearance already held", keys: ["sc clearance", "dv clearance", "developed vetting", "ctc clearance"] },
  { label: "Welsh language", keys: ["welsh language", "fluent in welsh"] },
  { label: "French language", keys: ["fluent in french", "french speaker"] },
];

export function legalSignal(text: string): "blocker" | "flag" | null {
  const chunks = text.split(/[\n•]/);
  let flag = false;
  for (const chunk of chunks) {
    const s = chunk.toLowerCase();
    const mentions =
      /qualified solicitor|practising solicitor|practicing solicitor|qualified lawyer|practising lawyer|practicing lawyer|legally qualified|practising certificate|practicing certificate|qualified uk solicitor/.test(
        s,
      );
    if (!mentions) continue;
    const soft = /prefer|ideal|desirable|advantage|beneficial|nice to have|not essential|or equivalent experience/.test(s);
    const hard = /must|required|essential|you will be|need to be|requirement|we are seeking a qualified|qualified uk solicitor/.test(s);
    if (hard && !soft) return "blocker";
    if (soft) flag = true;
    else flag = true;
  }
  return flag ? "flag" : null;
}

export function clearanceSignal(text: string): "blocker" | "flag" | null {
  const s = text.toLowerCase();
  if (!/clearance|developed vetting/.test(s)) return null;
  if (/ability to obtain|desirable|ideally|preferred/.test(s)) return "flag";
  if (/must hold|clearance required|essential/.test(s)) return "blocker";
  return "flag";
}

function salaryNote(input: ScoreInput): string {
  if (input.salaryMin == null && input.salaryMax == null) return "No salary or day rate is stated.";
  const symbol = input.currency === "USD" ? "$" : "£";
  const period = input.salaryPeriod === "day" ? " a day" : input.salaryPeriod === "hour" ? " an hour" : " a year";
  if (input.salaryMin != null && input.salaryMax != null && input.salaryMin !== input.salaryMax) {
    return `Stated pay is ${symbol}${input.salaryMin.toLocaleString("en-GB")} to ${symbol}${input.salaryMax.toLocaleString("en-GB")}${period}. There is no salary floor on this search.`;
  }
  const value = input.salaryMin ?? input.salaryMax;
  return `Stated pay is ${symbol}${value?.toLocaleString("en-GB")}${period}. There is no salary floor on this search.`;
}

export function scoreLocal(input: ScoreInput, settings: Settings): ScoreResult {
  const text = `${input.title}\n${input.description}`.toLowerCase();
  const core = settings.tiers.find((tier) => tier.id === "core");
  const adjacent = settings.tiers.find((tier) => tier.id === "adjacent");
  const coreHit = core?.phrases.some((phrase) => titleMatchesPhrase(input.title, phrase));
  const adjacentHit = adjacent?.phrases.some((phrase) => titleMatchesPhrase(input.title, phrase));
  let role = coreHit ? 32 : adjacentHit ? 26 : 18;
  const responsibilityHits = ["dpia", "ropa", "gdpr", "vendor", "dsar", "privacy", "governance", "training"].filter((key) =>
    text.includes(key),
  ).length;
  role = Math.min(40, role + Math.min(8, responsibilityHits));

  const matches: string[] = [];
  const gaps: string[] = [];
  for (const item of HAVE) {
    if (item.keys.some((key) => text.includes(key))) matches.push(item.label);
  }
  for (const item of LACK) {
    if (item.keys.some((key) => text.includes(key))) gaps.push(item.label);
  }
  const requirementCount = matches.length + gaps.length;
  const must = requirementCount === 0 ? 16 : Math.round((matches.length / requirementCount) * 25);

  const sectorWords = [
    "advertis",
    "marketing",
    "agency",
    "fmcg",
    "unilever",
    "government",
    "nhs",
    "hospital",
    "health",
    "charity",
    "financial",
    "bank",
    "insurance",
    "fintech",
    "automotive",
    "retail",
    "supermarket",
  ];
  const sectorHit = sectorWords.some((word) => text.includes(word) || input.company.toLowerCase().includes(word));
  const sector = sectorHit ? 14 : 8;

  let location = 10;
  let locationFit = "London or UK remote, which matches where he is applying.";
  if (input.europeRemote) {
    location = 6;
    locationFit = "Europe remote: shown, flagged, and scored down slightly.";
  } else if (input.workPattern === "on-site" && !/london|farnborough|reading|watford/.test(input.location.toLowerCase())) {
    location = 3;
    locationFit = "On site outside his usual London radius.";
  } else if (input.workPattern === "hybrid") {
    locationFit = "Hybrid, and the location is inside the search area.";
  } else if (input.workPattern === "remote") {
    locationFit = "UK remote, which is in scope.";
  }

  const seniorityOk = /head|director|manager|lead|dpo|officer|specialist/i.test(input.title);
  const seniority = seniorityOk ? 10 : 5;
  const seniorityFit = seniorityOk
    ? "Manager to director level, which is the range he is searching."
    : "The title sits below the manager level he is aiming for.";

  const blockers: string[] = [];
  const flags: string[] = [];
  const legal = legalSignal(input.description + "\n" + input.title);
  if (legal === "blocker") blockers.push("The spec requires a qualified solicitor. Nigel is not one.");
  if (legal === "flag") flags.push("A legal qualification is preferred, not required. The letter should say he is not a solicitor.");
  const clearance = clearanceSignal(input.description);
  if (clearance === "blocker") blockers.push("The spec requires a security clearance he does not hold.");
  if (clearance === "flag") flags.push("Security clearance is mentioned as desirable or as something he could obtain. He does not currently hold one.");

  let score = role + must + sector + location + seniority;
  if (blockers.length) score = Math.min(score, 40);
  score = Math.max(0, Math.min(100, Math.round(score)));

  const matchLine = matches.slice(0, 3).join(", ");
  const sentences = [
    `${input.title} at ${input.company} scores ${score}. ${matchLine ? `${matchLine} are in his documents.` : "The responsibilities sit close to the privacy operations work on his CV."}`,
    gaps.length
      ? `The spec also asks for ${gaps.join(" and ")}, which his CV, LinkedIn summary and personal statement do not support.`
      : "Nothing essential in the spec sits outside the experience in his documents.",
    blockers.length
      ? `Hard blocker: ${blockers[0]} The score is capped at 40.`
      : flags.length
        ? flags[0]
        : locationFit,
  ];

  return {
    score,
    summary: sentences.slice(0, 3).join(" "),
    matches,
    gaps,
    blockers,
    flags,
    seniorityFit,
    locationFit,
    salaryNote: salaryNote(input),
    model: "local-rubric",
    promptVersion: SCORE_PROMPT_VERSION,
  };
}

export async function scoreJob(input: ScoreInput, settings: Settings, profileText: string): Promise<ScoreResult> {
  const local = scoreLocal(input, settings);
  if (!process.env.ANTHROPIC_API_KEY) return local;
  const model = process.env.SCORING_MODEL || "claude-sonnet-5-5";
  try {
    const system = `You score UK data privacy jobs for Nigel Down. Return JSON only with keys score (0-100), summary (two or three sentences), matches, gaps, blockers, seniority_fit, location_fit, salary_note. Rubric: role and responsibilities 40, must-have requirements 25, sector and context 15, location and working pattern 10, seniority 10. A hard blocker (qualified solicitor required, on site outside his area, security clearance he lacks) caps the score at 40. Use only the profile. Do not invent experience.`;
    const user = `<profile>\n${profileText.slice(0, 12000)}\n</profile>\n<job>\n${JSON.stringify(input).slice(0, 14000)}\n</job>\n<local_hint>\n${JSON.stringify(local)}\n</local_hint>`;
    const text = await callClaude({
      model,
      system,
      user,
      maxTokens: 700,
      cacheSystem: true,
    });
    const parsed = ScoreSchema.parse(extractJson(text));
    const blockers = parsed.blockers.length ? parsed.blockers : local.blockers;
    let score = Math.max(0, Math.min(100, Math.round(parsed.score)));
    if (blockers.length) score = Math.min(score, 40);
    return {
      score,
      summary: parsed.summary,
      matches: parsed.matches,
      gaps: parsed.gaps,
      blockers,
      flags: local.flags,
      seniorityFit: parsed.seniority_fit,
      locationFit: parsed.location_fit,
      salaryNote: parsed.salary_note,
      model,
      promptVersion: SCORE_PROMPT_VERSION,
    };
  } catch (error) {
    return { ...local, summary: `${local.summary} Scoring model failed, so this score is from the local rubric (${error instanceof Error ? error.message : "error"}).` };
  }
}

export function toAssessment(jobId: string, result: ScoreResult, id: string, at: string): FitAssessment {
  return {
    id,
    jobId,
    model: result.model,
    promptVersion: result.promptVersion,
    score: result.score,
    summary: result.summary,
    matches: result.matches,
    gaps: result.gaps,
    blockers: result.blockers,
    flags: result.flags,
    seniorityFit: result.seniorityFit,
    locationFit: result.locationFit,
    salaryNote: result.salaryNote,
    createdAt: at,
  };
}
