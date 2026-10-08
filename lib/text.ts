import { EUROPE_PLACES, LONDON_RADIUS, OUTSIDE_CITIES } from "./defaults";
import type { WorkPattern } from "./types";

export function wordCount(text: string): number {
  return text
    .replace(/[—–]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function stripLongDashes(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,{2,}/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function toUkEnglish(text: string): string {
  const pairs: [RegExp, string][] = [
    [/\borganizations\b/gi, "organisations"],
    [/\borganization\b/gi, "organisation"],
    [/\borganized\b/gi, "organised"],
    [/\borganize\b/gi, "organise"],
    [/\bvisualizes\b/gi, "visualises"],
    [/\bvisualize\b/gi, "visualise"],
    [/\bpersonalized\b/gi, "personalised"],
    [/\bpersonalization\b/gi, "personalisation"],
    [/\bbehaviors\b/gi, "behaviours"],
    [/\bbehavior\b/gi, "behaviour"],
    [/\bcenters\b/gi, "centres"],
    [/\bcenter\b/gi, "centre"],
    [/\blicense\b/gi, "licence"],
    [/\bprograms\b/gi, "programmes"],
    [/\bprogram\b/gi, "programme"],
  ];
  let out = text;
  for (const [pattern, replacement] of pairs) out = out.replace(pattern, replacement);
  return out;
}

export function normaliseCompany(company: string): string {
  return company
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(ltd|limited|plc|inc|llc|group|uk|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(senior|junior|principal|interim)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function applicationKey(company: string, title: string): string {
  return `${normaliseCompany(company)}|${normaliseTitle(title)}`;
}

export function cityKey(location: string, workPattern: WorkPattern): string {
  const loc = location.toLowerCase();
  const places = [...LONDON_RADIUS, ...OUTSIDE_CITIES, ...EUROPE_PLACES];
  const hit = places.find((place) => loc.includes(place));
  if (workPattern === "remote" && !hit) return "uk-remote";
  if (hit) return hit;
  if (/\bremote\b/.test(loc)) return "remote";
  return loc.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
}

export function dedupeKey(company: string, title: string, location: string, workPattern: WorkPattern): string {
  return `${normaliseCompany(company)}|${normaliseTitle(title)}|${cityKey(location, workPattern)}`;
}

export function titleMatchesPhrase(title: string, phrase: string): boolean {
  const hay = title.toLowerCase();
  const needle = phrase.toLowerCase().replace(/&/g, "and");
  const normalisedHay = hay.replace(/&/g, "and");
  if (needle === "dpo") return /\bdpo\b/.test(hay);
  return normalisedHay.includes(needle);
}

const JUNIOR_TITLE = /\b(analyst|intern|graduate|trainee|apprentice|junior|executive|coordinator|administrator)\b/i;

const DOMAIN_TITLE = [
  /\bprivacy\b/i,
  /\bdata protection\b/i,
  /\bdpo\b/i,
  /\binformation governance\b/i,
  /\bdata governance\b/i,
  /\bai governance\b/i,
  /\bartificial intelligence governance\b/i,
  /\brecords management\b/i,
  /\bcompliance\b/i,
];

export function titleHasDomainToken(title: string): boolean {
  return DOMAIN_TITLE.some((pattern) => pattern.test(title));
}

export function juniorTitleReason(title: string): string | null {
  const t = title.toLowerCase();
  if (/\bdeputy\b/.test(t)) return null;
  if (/\b(data protection officer|privacy officer|chief privacy officer)\b/.test(t)) return null;
  if (/\bgroup dpo\b/.test(t)) return null;
  const match = t.match(JUNIOR_TITLE);
  if (!match) return null;
  const word = match[1];
  return `Title contains ${word.charAt(0).toUpperCase()}${word.slice(1)}`;
}

export function parseSalary(text: string): {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: "year" | "day" | "hour" | null;
  currency: string | null;
} {
  const period = /per hour|an hour|\/hour|\/hr/i.test(text)
    ? "hour"
    : /per day|a day|\/day|day rate/i.test(text)
      ? "day"
      : /per annum|a year|p\.a|salary|£\s?\d/i.test(text)
        ? "year"
        : null;
  const currency = /\$\s?\d/.test(text) ? "USD" : /£\s?\d/.test(text) ? "GBP" : null;
  const amounts: number[] = [];
  const re = /(?:£|\$)\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(\s?k)?/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    let value = Number(match[1].replace(/,/g, ""));
    if (match[2]) value *= 1000;
    amounts.push(value);
  }
  if (!amounts.length) {
    return { salaryMin: null, salaryMax: null, salaryPeriod: null, currency: null };
  }
  return {
    salaryMin: Math.min(...amounts),
    salaryMax: Math.max(...amounts),
    salaryPeriod: period,
    currency,
  };
}

export function inferWorkPattern(text: string): { workPattern: WorkPattern; hybridDays: number | null } {
  const hybridDays = text.match(/(\d)\s+days?(?:\s+a\s+week)?(?:\s+(?:in|on)\s+(?:the\s+)?(?:office|site))?/i);
  if (/hybrid/i.test(text)) {
    return { workPattern: "hybrid", hybridDays: hybridDays ? Number(hybridDays[1]) : null };
  }
  if (/fully remote|remote-first|uk remote|united kingdom.*remote|remote,\s*uk|work from home|home based/i.test(text)) {
    return { workPattern: "remote", hybridDays: null };
  }
  if (/\bremote\b/i.test(text) && !/on-?site/i.test(text)) {
    return { workPattern: "remote", hybridDays: null };
  }
  if (/on-?site/i.test(text)) return { workPattern: "on-site", hybridDays: null };
  return { workPattern: "hybrid", hybridDays: hybridDays ? Number(hybridDays[1]) : null };
}

export function statedContract(text: string): "permanent" | "fixed-term" | "contract" | "part-time" | "freelance" | null {
  const t = text.toLowerCase();
  if (/freelance|expert network|subject-matter expert/.test(t)) return "freelance";
  if (/inside ir35|outside ir35|day rate|per day|\bcontract\b|temporary/.test(t)) return "contract";
  if (/part[- ]time|0\.\d\s*fte/.test(t)) return "part-time";
  if (/fixed[- ]term|\bftc\b|maternity cover|\d+[- ]month/.test(t)) return "fixed-term";
  if (/\bpermanent\b|full[- ]time/.test(t)) return "permanent";
  return null;
}

export function inferContract(text: string): "permanent" | "fixed-term" | "contract" | "part-time" | "freelance" {
  return statedContract(text) ?? "permanent";
}

export function londonNow(date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return new Date(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+00:00`);
}

export function formatLongDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(date);
}

export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

export function formatMoney(amount: number, currency: string | null, period: "year" | "day" | "hour" | null): string {
  const symbol = currency === "USD" ? "$" : "£";
  const body =
    period === "year" && amount >= 1000
      ? `${symbol}${Math.round(amount / 1000)}k`
      : `${symbol}${amount.toLocaleString("en-GB")}`;
  if (period === "day") return `${body} a day`;
  if (period === "hour") return `${body} an hour`;
  return body;
}
