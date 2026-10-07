import { CONTACT } from "./defaults";
import { formatLongDate } from "./text";
import type { Letter, Settings } from "./types";

export function letterParagraphs(letter: Pick<Letter, "editedBody" | "body">): string[] {
  if (letter.editedBody) {
    return letter.editedBody
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }
  return letter.body;
}

export function disclaimerFor(letter: Pick<Letter, "disclaimerEnabled">, settings: Pick<Settings, "disclaimerEnabled" | "disclaimerText">): string | null {
  const enabled = letter.disclaimerEnabled ?? settings.disclaimerEnabled;
  if (!enabled) return null;
  return settings.disclaimerText;
}

export function suggestedSubject(title: string, company: string): string {
  return `Application for ${title}, ${company}`;
}

export function recipientLines(company: string, contact: string | null): string[] {
  const text = contact || "";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const named = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
  const lines: string[] = [];
  if (named && !/no named contact/i.test(text) && named[1] !== company) lines.push(named[1]);
  if (email) lines.push(email);
  if (company) lines.push(company);
  return lines;
}

export function letterBodyForDisplay(paragraphs: string[]): string[] {
  const next = paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean);
  if (next.length) {
    const greeting = next[0].match(/^dear\s+[^,\n]{1,80},\s*/i);
    if (greeting) {
      const rest = next[0].slice(greeting[0].length).trim();
      if (rest) next[0] = rest;
      else next.shift();
    }
  }
  if (next.length) {
    const close = next[next.length - 1].match(/\n?\s*(yours faithfully|yours sincerely|kind regards|best regards)\b[\s\S]*$/i);
    if (close && close.index !== undefined) {
      const rest = next[next.length - 1].slice(0, close.index).trim();
      if (rest) next[next.length - 1] = rest;
      else next.pop();
    }
  }
  return next;
}

export type FormalLetter = {
  sender: string[];
  date: string;
  recipient: string[];
  subject: string;
  salutation: string;
  paragraphs: string[];
  signOff: string;
  signature: string;
  disclaimer: string | null;
  plain: string;
};

export function formalLetter(
  letter: Pick<Letter, "editedBody" | "body" | "salutation" | "signOff" | "disclaimerEnabled" | "createdAt">,
  settings: Pick<Settings, "disclaimerEnabled" | "disclaimerText">,
  sender: { headline: string; addressLines: string[]; phone: string; email: string; linkedinUrl: string },
  job: { title: string; company: string },
  contact: string | null,
): FormalLetter {
  const senderLines = [
    CONTACT.name,
    sender.headline || CONTACT.title,
    CONTACT.certLine,
    ...sender.addressLines,
    sender.phone,
    sender.email,
    sender.linkedinUrl,
  ].filter(Boolean);
  const date = formatLongDate(letter.createdAt || new Date());
  const recipient = recipientLines(job.company, contact);
  const subject = suggestedSubject(job.title, job.company);
  const paragraphs = letterBodyForDisplay(letterParagraphs(letter));
  const disclaimer = disclaimerFor(letter, settings);
  const blocks = [
    senderLines.join("\n"),
    date,
    recipient.length ? recipient.join("\n") : "",
    `Suggested subject: ${subject}`,
    letter.salutation,
    ...paragraphs,
    letter.signOff,
    CONTACT.name,
    disclaimer || "",
  ].filter(Boolean);
  return {
    sender: senderLines,
    date,
    recipient,
    subject,
    salutation: letter.salutation,
    paragraphs,
    signOff: letter.signOff,
    signature: CONTACT.name,
    disclaimer,
    plain: blocks.join("\n\n"),
  };
}

export function plainLetter(
  letter: Pick<Letter, "editedBody" | "body" | "refLine" | "salutation" | "signOff" | "disclaimerEnabled">,
  settings: Pick<Settings, "disclaimerEnabled" | "disclaimerText">,
  date = new Date(),
): string {
  const disclaimer = disclaimerFor(letter, settings);
  const lines = [
    CONTACT.name,
    CONTACT.title,
    CONTACT.certLine,
    ...CONTACT.address,
    `m: ${CONTACT.phone}`,
    `email: ${CONTACT.email}`,
    `LinkedIn: ${CONTACT.linkedin}`,
    "",
    formatLongDate(date),
    letter.refLine,
    "",
    letter.salutation,
    "",
    ...letterParagraphs(letter).flatMap((paragraph) => [paragraph, ""]),
    letter.signOff,
    "",
    CONTACT.name,
  ];
  if (disclaimer) lines.push("", disclaimer);
  return lines.join("\n");
}
