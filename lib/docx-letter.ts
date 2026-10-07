import { CONTACT } from "@/lib/defaults";
import { disclaimerFor, letterParagraphs, plainLetter } from "@/lib/letter-plain";
import { formatLongDate } from "@/lib/text";
import type { Letter, Settings } from "@/lib/types";
import { Document, Footer, Header, Packer, Paragraph, TextRun } from "docx";

export { plainLetter };

function run(text: string, size = 20, extras: { bold?: boolean; color?: string; italics?: boolean } = {}) {
  return new TextRun({ text, font: "Calibri", size, bold: extras.bold, italics: extras.italics, color: extras.color });
}

function para(text: string, size = 20, extras: { bold?: boolean; color?: string } = {}) {
  return new Paragraph({ spacing: { after: 160 }, children: [run(text, size, extras)] });
}

export async function renderLetterDocx(letter: Letter, settings: Settings): Promise<Buffer> {
  const disclaimer = disclaimerFor(letter, settings);
  const header = new Header({
    children: [
      para(`${CONTACT.name} | ${CONTACT.certLine}`, 18),
      ...CONTACT.address.map((line) => para(line, 18)),
      para(`m: ${CONTACT.phone}`, 18),
      para(`email: ${CONTACT.email}`, 18),
      para(`LinkedIn: ${CONTACT.linkedin}`, 18),
    ],
  });
  const children = [
    para(formatLongDate(new Date())),
    para(letter.refLine, 20, { bold: true }),
    para(letter.salutation),
    ...letterParagraphs(letter).map((paragraph) => para(paragraph)),
    para(letter.signOff),
    para(""),
    para(CONTACT.name),
  ];
  if (disclaimer) children.push(para(disclaimer, 16, { color: "6B6B6B" }));
  const footer = new Footer({ children: [para("")] });
  const doc = new Document({
    sections: [{ headers: { default: header }, footers: { default: footer }, children }],
  });
  return Packer.toBuffer(doc);
}
