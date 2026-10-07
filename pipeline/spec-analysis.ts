import { z } from "zod";
import type { Job, SpecPoint } from "@/lib/types";
import { stripLongDashes, toUkEnglish } from "@/lib/text";
import { callClaude, extractJson } from "./llm";

function writingModel(): string {
  return process.env.WRITING_MODEL || "claude-fable-5-1";
}

const AnalysisSchema = z.object({
  points: z
    .array(
      z.object({
        want: z.string().min(12),
        show: z.string().min(12),
      }),
    )
    .min(3)
    .max(5),
});

let creditsExhausted = false;

const THEMES: { id: string; pattern: RegExp; want: string; show: string; cv?: RegExp; have?: string }[] = [
  {
    id: "onetrust",
    pattern: /onetrust|one trust/i,
    want: "They want someone who can work in OneTrust, not only describe a privacy programme from the outside.",
    show: "Name OneTrust on the CV if you have used it. Alongside that, show the work it usually holds: DPIAs, records of processing, and vendor reviews.",
    cv: /onetrust|one trust/i,
    have: "OneTrust is already on your CV. Put it near the top of the letter, next to the DPIAs and vendor reviews you run in it.",
  },
  {
    id: "ai",
    pattern: /artificial intelligence|\bAI\b|AIGP|algorithm/i,
    want: "They want privacy and AI governance held together, not treated as a side note.",
    show: "AIGP is the certificate to put next to this. You already embed AI governance through training, questionnaires, and privacy by design.",
  },
  {
    id: "dpo",
    pattern: /\bDPO\b|data protection officer/i,
    want: "They want a Data Protection Officer who will hold the brief, not a lawyer sitting beside it.",
    show: "Show the privacy operations you have run, and say plainly that you are not a solicitor. CIPP/E, CIPM and AIGP are the credentials beside that.",
  },
  {
    id: "international",
    pattern: /international|multi-?country|cross-border|APAC|LATAM|\bEU\b|global/i,
    want: "They want privacy that works across countries, not only a UK policy on a shelf.",
    show: "You have run this across the UK, EU, APAC and LATAM, including SCCs, IDTAs, and transfers. That is the line to make easy to find.",
  },
  {
    id: "dpia",
    pattern: /DPIA|privacy impact|privacy by design|by default|assessment/i,
    want: "They want privacy assessments built into the work as it is designed.",
    show: "Your CV already covers DPIAs, privacy by design, and mapping how data moves. Put a real example near the top of the letter.",
  },
  {
    id: "records",
    pattern: /record of processing|RoPA|records and information|information governance|data inventory|retention/i,
    want: "They want the records in order: what is held, where it sits, and how long it stays.",
    show: "You have kept data inventories, records of processing, and the day-to-day governance around them. Say that in plain words.",
  },
  {
    id: "breach",
    pattern: /breach|incident|personal data breach/i,
    want: "They want someone who has actually handled a breach, not only written the procedure.",
    show: "Breach management is already on your CV. One calm sentence on how you have run it is enough.",
  },
  {
    id: "vendors",
    pattern: /vendor|supplier|DPA\b|due diligence|third part/i,
    want: "They want supplier privacy handled properly: contracts, reviews, and the questions that sit behind them.",
    show: "You already manage DPAs, vendor due diligence, and the transfer tools that go with them. Make that visible.",
  },
  {
    id: "training",
    pattern: /training|awareness|culture|embed/i,
    want: "They want privacy practised by the people doing the work, not only written down.",
    show: "You have done this in conversation and in training, including the questionnaires teams actually fill in.",
  },
  {
    id: "programme",
    pattern: /framework|programme|program\b|overseeing|implement|developing our data/i,
    want: "They want someone to build and look after the privacy programme, not only answer questions as they arrive.",
    show: "The eight years at MullenLowe Global are the proof: you were the person the business came to, across regions. You left in July 2026, so say it as past work.",
  },
];

export function localSpecAnalysis(description: string, profileText = ""): SpecPoint[] {
  const points: SpecPoint[] = [];
  for (const theme of THEMES) {
    if (!theme.pattern.test(description)) continue;
    const show = theme.cv && theme.cv.test(profileText) && theme.have ? theme.have : theme.show;
    points.push({ want: theme.want, show });
    if (points.length === 4) break;
  }
  if (!points.some((point) => /CIPP\/E/.test(point.show))) {
    points.unshift({
      want: "They want a privacy lead with real credentials, not a generalist who will learn the subject on the job.",
      show: "Open with CIPP/E, CIPM and AIGP. They are yours, and they tell a hiring manager what kind of privacy work this is.",
    });
  }
  if (points.length < 3) {
    points.push({
      want: "They want a person who has run privacy inside a business, with the legal team nearby rather than instead of them.",
      show: "More than ten years, and eight of them as the go-to privacy person at MullenLowe Global. Say you work with lawyers. Do not say you are one.",
    });
  }
  return points.slice(0, 4).map(tidyPoint);
}

export async function buildSpecAnalysis(
  job: Pick<Job, "title" | "company" | "descriptionText">,
  profile: { cvText: string; linkedinSummary: string; personalStatement: string },
): Promise<SpecPoint[]> {
  const profileText = [profile.cvText, profile.linkedinSummary, profile.personalStatement].filter(Boolean).join("\n");
  const local = localSpecAnalysis(`${job.title}\n${job.descriptionText}`, profileText);
  if (!process.env.ANTHROPIC_API_KEY || creditsExhausted) return local;
  try {
    const text = await callClaude({
      model: writingModel(),
      maxTokens: 1200,
      system: [
        "You analyse a job spec for Nigel Down, a UK data privacy lead. UK English. No em dashes or en dashes. No exclamation marks.",
        "Return JSON only: { points: [ { want, show } ] } with 3 or 4 points.",
        "want: what this employer is looking for, in one or two sentences, grounded only in the spec. Do not copy a requirement list.",
        "show: what Nigel should make visible in the letter, tied to the CV facts below. He holds CIPP/E, CIPM and AIGP. He is not a solicitor. He left MullenLowe Global in July 2026. Do not invent employers, tools, or dates.",
        "Do not give generic advice such as tailor your letter or show enthusiasm.",
        profileText.slice(0, 4000),
      ].join("\n\n"),
      user: `Company: ${job.company}\nTitle: ${job.title}\n\n${job.descriptionText.slice(0, 7000)}`,
    });
    const parsed = AnalysisSchema.parse(extractJson(text));
    return parsed.points.map(tidyPoint);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/credit balance|billing|invalid_request_error/i.test(message)) creditsExhausted = true;
    return local;
  }
}

function tidyPoint(point: SpecPoint): SpecPoint {
  return {
    want: toUkEnglish(stripLongDashes(point.want)).trim(),
    show: toUkEnglish(stripLongDashes(point.show)).trim(),
  };
}
