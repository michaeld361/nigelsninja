import { wordCount } from "./text";

const CLICHES = [
  "passionate",
  "hit the ground running",
  "dynamic",
  "synergy",
  "leverage",
  "delve",
  "i am excited",
  "i'm excited",
];

export function styleCheck(body: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (/[—–]/.test(body)) issues.push("Contains an em dash or en dash");
  const words = wordCount(body);
  if (words < 220 || words > 380) issues.push(`Word count ${words} is outside 220 to 380`);
  if (/\b(organization|organizations|organize|organized|visualizes|visualize|personalization|behavior|behaviors)\b/i.test(body)) {
    issues.push("Uses American spelling");
  }
  if (/\bprogram\b/i.test(body)) issues.push("Uses program instead of programme");
  const mantle = body.match(/\bmantle\b/gi);
  if (mantle && mantle.length > 1) issues.push("Mentions Mantle more than once");
  if (/current role/i.test(body)) issues.push('Says "current role"');
  if (body.includes("!")) issues.push("Contains an exclamation mark");
  const lower = body.toLowerCase();
  for (const cliche of CLICHES) {
    if (lower.includes(cliche)) issues.push(`Contains the cliche "${cliche}"`);
  }
  if (!body.includes("CIPP/E, CIPM and AIGP")) {
    issues.push('Certifications are not written as "CIPP/E, CIPM and AIGP"');
  }
  return { ok: issues.length === 0, issues };
}
