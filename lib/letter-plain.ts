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
