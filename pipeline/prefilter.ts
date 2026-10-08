import { EUROPE_PLACES, LONDON_RADIUS } from "@/lib/defaults";
import { juniorTitleReason, statedContract, titleHasDomainToken } from "@/lib/text";
import type { ContractType, Settings, WorkPattern } from "@/lib/types";

export type LocationVerdict = {
  drop: boolean;
  reason?: string;
  europeRemote: boolean;
};

const FLEXIBLE = /\bremote\b|\bhybrid\b|home-based|home based|work from home/i;
const COUNTRY = /^(united kingdom|uk|england)$/i;
const WORK_WORD = /^(on-?site|hybrid|remote|home-based|home based|uk|united kingdom|england|scotland|wales|office|based|greater|city|area)$/i;

function placeTokens(location: string): string[] {
  return location
    .toLowerCase()
    .split(/\s*(?:,|\/|\||;|\n|\band\b|\bor\b)\s*/)
    .map((part) => part.replace(/[().]/g, " ").replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 2 && !WORK_WORD.test(part));
}

function inRadius(token: string): boolean {
  return LONDON_RADIUS.some((place) => token === place || token.includes(place));
}

function isEurope(location: string): boolean {
  const loc = location.toLowerCase();
  const uk = /\buk\b|united kingdom|england|scotland|wales|london/.test(loc);
  return EUROPE_PLACES.some((place) => loc.includes(place)) && !uk;
}

export function assessLocation(input: { location: string; workPattern: WorkPattern; description?: string }): LocationVerdict {
  const loc = input.location.trim();
  const blob = `${loc}\n${input.description || ""}`;
  const europeRemote = (input.workPattern === "remote" || /\bremote\b/i.test(loc)) && isEurope(loc);
  if (input.workPattern !== "on-site") return { drop: false, europeRemote };
  if (FLEXIBLE.test(blob)) return { drop: false, europeRemote: false };
  if (!loc || COUNTRY.test(loc)) return { drop: false, europeRemote: false };
  const places = placeTokens(loc);
  if (places.length !== 1) return { drop: false, europeRemote: false };
  if (inRadius(places[0]) || COUNTRY.test(places[0])) return { drop: false, europeRemote: false };
  return {
    drop: true,
    reason: `On site outside the London radius (${input.location})`,
    europeRemote: false,
  };
}

export function enabledPhrases(settings: Settings): string[] {
  return settings.tiers.filter((tier) => tier.enabled).flatMap((tier) => tier.phrases);
}

export const PRACTISING_QUALIFICATION = "Requires a legal practising qualification";

const LEGAL_TITLE = /\b(lawyer|solicitor|barrister|counsel)\b/i;

export function practisingQualificationReason(title: string, _description = ""): string | null {
  if (LEGAL_TITLE.test(title)) return PRACTISING_QUALIFICATION;
  return null;
}

export function prefilterJob(
  input: {
    title: string;
    location: string;
    workPattern: WorkPattern;
    contractType: ContractType;
    description?: string;
    contractExplicit?: ContractType | null;
  },
  settings: Settings,
): { keep: boolean; reason: string | null; europeRemote: boolean } {
  const legal = practisingQualificationReason(input.title);
  if (legal) return { keep: false, reason: legal, europeRemote: false };

  const junior = juniorTitleReason(input.title);
  if (junior) return { keep: false, reason: junior, europeRemote: false };

  if (!titleHasDomainToken(input.title)) {
    return { keep: false, reason: "Title is outside the privacy search", europeRemote: false };
  }

  const explicit =
    input.contractExplicit !== undefined ? input.contractExplicit : statedContract(`${input.title}\n${input.description || ""}`);
  if (explicit && !settings.contractTypes[explicit]) {
    return { keep: false, reason: `Contract type ${explicit} is turned off`, europeRemote: false };
  }

  const location = assessLocation(input);
  if (location.drop) return { keep: false, reason: location.reason ?? "Outside location", europeRemote: false };
  return { keep: true, reason: null, europeRemote: location.europeRemote };
}
