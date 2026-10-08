import { LETTER_PROMPT_VERSION } from "@/lib/defaults";
import { styleCheck } from "@/lib/style-check";
import { stripLongDashes, toUkEnglish, wordCount } from "@/lib/text";
import type { Settings } from "@/lib/types";
import { factCheck } from "./check";
import { appendWeighing } from "@/lib/weighing";
import { callClaude, extractJson } from "./llm";
import type { ScoreResult } from "./score";
import fs from "fs";
import path from "path";
import { z } from "zod";

const LetterSchema = z.object({
  ref_line: z.string(),
  salutation: z.string(),
  body_paragraphs: z.array(z.string()).min(3).max(6),
  sign_off: z.string(),
  notes_for_nigel: z.string(),
});

export type LetterDraft = {
  refLine: string;
  salutation: string;
  body: string[];
  signOff: string;
  notesForNigel: string;
  unsupportedClaims: string[];
  styleIssues: string[];
  wordCount: number;
  model: string;
  configuredWritingModel: string;
  promptVersion: string;
};

export type LetterJob = {
  company: string;
  title: string;
  location: string;
  contractType: string;
  sourceLabel: string;
  description: string;
  letterNotes: string;
};

const THEMES: { keys: string[]; sentence: string; mantle?: boolean }[] = [
  {
    keys: ["dpia", "impact assessment"],
    sentence:
      "Impact assessments have been a regular part of the work: DPIAs, PTAs and transfer assessments, written so the business can see the risk and the control in the same place.",
  },
  {
    keys: ["ropa", "record of processing"],
    sentence:
      "I have kept records of processing current as campaigns, vendors and systems changed, rather than treating the register as a document that is refreshed once a year.",
  },
  {
    keys: ["vendor", "due diligence", "supplier", "processor"],
    sentence:
      "At MullenLowe I ran vendor due diligence, including the annual review of suppliers and their DPAs, and I stepped back in when a process changed mid year.",
  },
  {
    keys: ["scc", "idta", "transfer", "cross-border", "international"],
    sentence:
      "Cross border transfers were part of the day job across EMEA, APAC and LATAM, including SCCs and IDTAs, with the legal team on the points that needed a lawyer.",
  },
  {
    keys: ["dsar", "subject access", "data subject"],
    sentence:
      "I have handled data subject requests, including DSARs, and set teams up to respond properly when the volume rose rather than treating each one as a surprise.",
  },
  {
    keys: ["training", "awareness"],
    sentence:
      "I wrote and delivered role based privacy training, including inductions on privacy by design, and a quarterly privacy film for staff in more than one language.",
  },
  {
    keys: ["merger", "acquisition", "divest", "m&a", "tsa"],
    sentence:
      "I have supported the privacy side of mergers, acquisitions and divestitures, including transition service agreements, and kept the compliance position intact while the business changed shape.",
  },
  {
    keys: ["onetrust", "one trust"],
    sentence:
      "I was on the IPG and Omnicom project team for the global OneTrust rollout, so I know the difference between switching a privacy platform on and getting people to use it.",
  },
  {
    keys: ["purview"],
    sentence:
      "I have worked with Microsoft Purview alongside the privacy programme, particularly where advertising and technology teams need a practical view of how data is being used.",
  },
  {
    keys: ["artificial intelligence", "ai governance", " ai "],
    sentence:
      "AI governance has sat inside the privacy work: questionnaires, assessments and advice before a new tool goes live. I am also studying for the CIPT.",
  },
  {
    keys: ["master data", "stewardship", "data management"],
    sentence:
      "I have a working knowledge of master data management and data stewardship, and I am used to sitting with the people who own the data rather than only with the policy.",
  },
  {
    keys: ["iso 27001", "iso27001", "iso 27701", "nist"],
    sentence:
      "I am familiar with ISO 27001, ISO 27701 and the NIST frameworks, and I have used them as a way to talk about control with security colleagues rather than as a badge.",
  },
  {
    keys: ["metric", "dashboard", "reporting"],
    mantle: true,
    sentence:
      "Alongside that I led Mantle, a dashboard that showed where processing was happening and where the privacy risk sat, so leadership could see the position without a long pack.",
  },
];

function sourceName(label: string): string {
  if (/reed/i.test(label)) return "Reed.co.uk";
  if (/indeed/i.test(label)) return "Indeed";
  if (/glassdoor/i.test(label)) return "Glassdoor";
  if (/linkedin/i.test(label)) return "LinkedIn";
  return label || "the job board";
}

function wantsMantle(notes: string, description: string): boolean {
  return /dashboard|mantle|metric/i.test(`${notes}\n${description}`);
}

function pickThemes(description: string, notes: string, allowMantle: boolean): string[] {
  const hay = ` ${description.toLowerCase()} ${notes.toLowerCase()} `;
  const chosen: string[] = [];
  for (const theme of THEMES) {
    if (theme.mantle && !allowMantle) continue;
    if (theme.keys.some((key) => hay.includes(key))) chosen.push(theme.sentence);
    if (chosen.length === 3) break;
  }
  if (!chosen.length) {
    chosen.push(
      "The work I know best is practical privacy operations: DPIAs, records of processing, vendor due diligence, DSARs and training, delivered with the teams who have to live with the process.",
    );
  }
  if (/purview/i.test(notes) && !chosen.some((sentence) => /Purview/.test(sentence))) {
    chosen.unshift(THEMES.find((theme) => theme.keys.includes("purview"))!.sentence);
  }
  if (/master data|stewardship|business analysis/i.test(notes) && !chosen.some((sentence) => /master data/i.test(sentence))) {
    chosen.push(THEMES.find((theme) => theme.keys.includes("master data"))!.sentence);
  }
  return chosen.slice(0, 4);
}

function exampleFor(company: string, description: string): string {
  const hay = `${company} ${description}`.toLowerCase();
  if (/charit|nhs|hospital|hero|government|health/.test(hay)) {
    return "During the Covid pandemic I was part of the MullenLowe team delivering UK Government communications, and I sat on the business continuity team for the UK and EU. That work had to be accurate, fast and careful with personal data.";
  }
  if (/unilever|fmcg|retail|supermarket|tesco|john lewis|consumer|brand/.test(hay)) {
    return "At MullenLowe I was responsible for agency and campaign adherence to GDPR across UK and EU agencies and for Unilever globally, covering home care, personal care, food and ice cream.";
  }
  if (/bank|financ|insur|invest|fintech|monzo|revolut|wise|affirm/.test(hay)) {
    return "Earlier I supported privacy and delivery on accounts including Lloyds Bank and Western Union, where a high volume of personal data had to sit inside a process the teams would actually follow.";
  }
  if (/auto|bmw|car|motor|vehicle/.test(hay)) {
    return "Before MullenLowe I led data privacy and production for highly personalised communications at HPS for BMW, Mini, Mazda and Rolls-Royce.";
  }
  if (/adtech|advertis|marketing|agency|behavioural|behavioral|media/.test(hay)) {
    return "My background is in advertising and data driven personalisation, including Virgin Media at Rapp and Tesco Clubcard at Dunnhumby, so the privacy questions that come with a large consumer database are familiar.";
  }
  return "At MullenLowe I was the person teams came to for DPIAs, records of processing, vendor reviews and data subject requests, and I kept the advice practical enough to use the same week.";
}

function gapSentences(score: ScoreResult, notes: string): string[] {
  const sentences: string[] = [];
  const solicitor =
    score.blockers.some((item) => /solicitor|lawyer/i.test(item)) ||
    score.flags.some((item) => /solicitor|lawyer/i.test(item)) ||
    /solicitor|lawyer/i.test(notes);
  if (solicitor) {
    sentences.push(
      "Although I am not a qualified solicitor, I offer significant knowledge, experience and management of privacy compliance, and I have worked closely with legal teams throughout.",
    );
  }
  if (score.gaps.some((gap) => /clearance/i.test(gap)) || /clearance/i.test(notes)) {
    sentences.push("I do not currently hold a security clearance. If the role needs one, that is a gap I should be straight about.");
  }
  const other = score.gaps.filter((gap) => !/solicitor|clearance/i.test(gap));
  if (other.length) {
    sentences.push(
      `I have not claimed experience of ${other.join(" or ").toLowerCase()}, because it is not in my CV or personal statement.`,
    );
  }
  return sentences;
}

function clean(text: string): string {
  return toUkEnglish(stripLongDashes(text)).replace(/!/g, ".").replace(/\s+/g, " ").trim();
}

function paragraphs(parts: string[][]): string[] {
  return parts
    .map((group) => clean(group.filter(Boolean).join(" ")))
    .filter((paragraph) => paragraph.length > 0);
}

export function draftLetterLocal(job: LetterJob, score: ScoreResult, settings: Settings, length: "normal" | "longer" | "shorter" = "normal"): LetterDraft {
  const allowMantle = wantsMantle(job.letterNotes, job.description) || /dashboard/i.test(settings.standingNotes);
  const themes = pickThemes(job.description, `${job.letterNotes}\n${settings.standingNotes}`, allowMantle);
  const mantleAlready = themes.some((sentence) => /\bMantle\b/.test(sentence));
  const specRead = /brand|trust|values|purpose|mission/i.test(job.description)
    ? `The posting is clear about what ${job.company} is trying to protect, and that is the part of the spec I would want to talk through.`
    : "";
  const trusted = /trusted brand/i.test(job.letterNotes)
    ? `${job.company} is a trusted brand, so the privacy advice has to be careful with reputation as well as with the regulation.`
    : "";
  const start = /start date|asap|immediately|as soon as/i.test(job.description) ? "I am available immediately." : "";

  const opening = [
    `I am writing to apply for the ${job.title} position at ${job.company}, which I saw on ${sourceName(job.sourceLabel)}.`,
    "I have more than ten years of hands-on experience in data privacy and international data protection, with CIPP/E, CIPM and AIGP.",
    "In my most recent role I was Data Privacy and Operations Director at MullenLowe Global, from January 2018 until I left in July 2026.",
    start,
    trusted,
  ];
  const mapped = themes;
  const example = [exampleFor(job.company, job.description)];
  if (allowMantle && !mantleAlready && length !== "shorter") {
    example.push(
      "I also led Mantle, a dashboard used as supporting evidence for privacy risk and processing activity. It helped the conversation. It was not the centre of the role.",
    );
  }
  const gaps = gapSentences(score, job.letterNotes);
  const close = [
    specRead,
    `Thank you for considering my application. I would welcome a conversation about how I would approach the role at ${job.company}.`,
  ];
  const extra = [
    "I am used to being the primary contact for privacy, whether that is one team or a global group of agencies, and to explaining the same point to a lawyer, a producer and a finance director.",
    "Privacy by design, in my experience, only sticks when it is built into the brief, the vendor conversation and the training, not added as a review at the end.",
    "I have also supported audits, client onboarding and the privacy questions that come with new business, and I am comfortable being the person who gives a clear answer the same day.",
  ];

  let body = paragraphs([opening, mapped, example, [...gaps, ...close]]);
  let count = wordCount(body.join(" "));
  if (length === "longer" || count < 250) {
    body = paragraphs([opening, mapped, example, [...gaps, extra[0], extra[1], ...close]]);
    count = wordCount(body.join(" "));
  }
  if (count < 220) {
    body = paragraphs([opening, [...mapped, extra[2]], example, [...gaps, extra[0], extra[1], ...close]]);
    count = wordCount(body.join(" "));
  }
  if (length === "shorter" || count > 360) {
    body = paragraphs([opening.filter((line) => line !== trusted), mapped.slice(0, 2), example.slice(0, 1), [...gaps.slice(0, 1), close[1]]]);
    count = wordCount(body.join(" "));
  }

  const notes = [
    `Emphasised ${themes.length ? "the parts of the spec that match his privacy operations work" : "his core privacy operations experience"}.`,
    score.blockers.length ? `Blocker kept in view: ${score.blockers.join(" ")}` : "",
    score.gaps.length ? `Left out, because his documents do not support it: ${score.gaps.join("; ")}.` : "No unsupported requirement was written in as experience.",
    mantleAlready || (allowMantle && body.join(" ").includes("Mantle")) ? "Mantle is mentioned once, as support." : "Mantle was left out.",
    job.letterNotes ? `Notes for this letter: ${job.letterNotes}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const configured = process.env.WRITING_MODEL || "claude-fable-5-1";
  const draft: LetterDraft = {
    refLine: `Ref: ${job.company}, ${job.title}`,
    salutation: "Dear Hiring Manager,",
    body,
    signOff: "Kind regards,",
    notesForNigel: clean(notes),
    unsupportedClaims: [],
    styleIssues: [],
    wordCount: wordCount(body.join(" ")),
    model: "local-draft",
    configuredWritingModel: configured,
    promptVersion: LETTER_PROMPT_VERSION,
  };
  draft.unsupportedClaims = factCheck(draft.body.join("\n"), "");
  draft.styleIssues = styleCheck(draft.body.join("\n\n")).issues;
  return draft;
}

export function enforceStyle(draft: LetterDraft, job: LetterJob, score: ScoreResult, settings: Settings): LetterDraft {
  const check = styleCheck(draft.body.join("\n\n"));
  if (check.ok) return { ...draft, styleIssues: [], wordCount: wordCount(draft.body.join("\n\n")) };
  const words = wordCount(draft.body.join("\n\n"));
  if (words < 220 || words > 380) {
    const again = draftLetterLocal(job, score, settings, words < 220 ? "longer" : "shorter");
    const second = styleCheck(again.body.join("\n\n"));
    return { ...again, styleIssues: second.issues, wordCount: wordCount(again.body.join("\n\n")) };
  }
  return { ...draft, styleIssues: check.issues, wordCount: words };
}

function promptFile(name: string): string {
  const file = path.join(process.cwd(), "prompts", name);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

export function letterSystem(settings: Settings, profileText: string, weighing = ""): string {
  const base = `${promptFile("letter-v1.md")}\n<style_examples>\n${promptFile("examples.md")}\n</style_examples>\n<standing_notes>\n${settings.standingNotes}\n</standing_notes>\n<profile>\n${profileText.slice(0, 14000)}\n</profile>`;
  return appendWeighing(base, weighing);
}

export async function draftLetter(
  job: LetterJob,
  score: ScoreResult,
  settings: Settings,
  profileText: string,
  weighing = "",
): Promise<LetterDraft> {
  const local = enforceStyle(draftLetterLocal(job, score, settings), job, score, settings);
  local.unsupportedClaims = factCheck(local.body.join("\n"), profileText);
  if (!process.env.ANTHROPIC_API_KEY) return local;

  const model = process.env.WRITING_MODEL || "claude-fable-5-1";
  try {
    const system = letterSystem(settings, profileText, weighing);
    const user = `<job>\ncompany: ${job.company}\ntitle: ${job.title}\nlocation: ${job.location}\ncontract: ${job.contractType}\nsource: ${job.sourceLabel}\nspec: ${job.description.slice(0, 12000)}\n</job>\n<fit_assessment>\n${JSON.stringify(score)}\n</fit_assessment>\n<notes_for_this_letter>\n${job.letterNotes}\n</notes_for_this_letter>`;
    const text = await callClaude({ model, system, user, maxTokens: 1400, cacheSystem: true });
    const parsed = LetterSchema.parse(extractJson(text));
    let body = parsed.body_paragraphs.map((paragraph) => clean(paragraph));
    let draft: LetterDraft = {
      refLine: clean(parsed.ref_line),
      salutation: clean(parsed.salutation) || "Dear Hiring Manager,",
      body,
      signOff: "Kind regards,",
      notesForNigel: clean(parsed.notes_for_nigel),
      unsupportedClaims: [],
      styleIssues: [],
      wordCount: wordCount(body.join("\n\n")),
      model,
      configuredWritingModel: model,
      promptVersion: LETTER_PROMPT_VERSION,
      };
    const checked = styleCheck(draft.body.join("\n\n"));
    if (!checked.ok && (draft.wordCount < 220 || draft.wordCount > 380)) {
      const retry = await callClaude({
        model,
        system,
        user: `${user}\nThe previous letter was ${draft.wordCount} words. Rewrite it between 250 and 350 words. Keep every hard rule.`,
        maxTokens: 1400,
        cacheSystem: true,
      });
      const second = LetterSchema.parse(extractJson(retry));
      body = second.body_paragraphs.map((paragraph) => clean(paragraph));
      draft = { ...draft, body, notesForNigel: clean(second.notes_for_nigel), wordCount: wordCount(body.join("\n\n")), model };
    }
    draft.styleIssues = styleCheck(draft.body.join("\n\n")).issues;
    draft.unsupportedClaims = factCheck(draft.body.join("\n"), profileText);
    if (draft.unsupportedClaims.length) {
      draft.notesForNigel = `${draft.notesForNigel} Check this: ${draft.unsupportedClaims.join(" ")}`;
    }
    return draft;
  } catch {
    return local;
  }
}
