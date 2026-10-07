import { EUROPE_PLACES, LONDON_RADIUS, OUTSIDE_CITIES } from "@/lib/defaults";
import { juniorTitleReason, titleMatchesPhrase } from "@/lib/text";
import type { ContractType, Settings, WorkPattern } from "@/lib/types";

export type LocationVerdict = {
  drop: boolean;
  reason?: string;
  europeRemote: boolean;
};

export function assessLocation(input: { location: string; workPattern: WorkPattern }): LocationVerdict {
  const loc = input.location.toLowerCase();
  const remote = input.workPattern === "remote" || (/\bremote\b/.test(loc) && input.workPattern !== "on-site");
  const uk = /\buk\b|united kingdom|england|scotland|wales|london/.test(loc);
  const inRadius = LONDON_RADIUS.some((place) => loc.includes(place));
  const outside = OUTSIDE_CITIES.some((place) => loc.includes(place));
  const europe = EUROPE_PLACES.some((place) => loc.includes(place)) && !uk;

  if (input.workPattern === "remote" || (remote && !outside)) {
    if (europe && !inRadius) return { drop: false, europeRemote: true };
    return { drop: false, europeRemote: false };
  }

  if (inRadius) return { drop: false, europeRemote: false };
  if (outside || europe) {
    return {
      drop: true,
      reason: `On site outside the London radius (${input.location})`,
      europeRemote: false,
    };
  }
  if (uk && input.workPattern !== "on-site") return { drop: false, europeRemote: false };
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

const QUALIFICATION =
  /\b(qualified lawyer|qualified solicitor|qualified barrister|practising certificate|practicing certificate|practising solicitor|practicing solicitor|practising barrister|practising lawyer|practicing lawyer|admission to the roll|admitted to the roll|called to the bar|legally qualified)\b/i;

const COUNSEL_TITLE = /\b(solicitor|barrister|lawyer|counsel)\b/i;

const WORKS_WITH_LAWYERS =
  /\b(work(?:ing)? (?:closely )?with|alongside|external legal|instruct(?:ing)?|partner with|support(?:ing)?|report(?:ing)? to|general counsel|our counsel|legal team|in-house counsel)\b/i;

const SOFT = /prefer|ideal|desirable|advantage|beneficial|nice to have|not essential|or equivalent experience/i;

export function practisingQualificationReason(title: string, description = ""): string | null {
  if (COUNSEL_TITLE.test(title)) return PRACTISING_QUALIFICATION;
  const chunks = `${title}\n${description}`.split(/[\n•*]/);
  for (const chunk of chunks) {
    if (!QUALIFICATION.test(chunk) && !/\bmust be an? (solicitor|barrister|lawyer|counsel)\b/i.test(chunk)) continue;
    if (WORKS_WITH_LAWYERS.test(chunk) && !QUALIFICATION.test(chunk)) continue;
    if (SOFT.test(chunk)) continue;
    return PRACTISING_QUALIFICATION;
  }
  return null;
}

export function prefilterJob(
  input: {
    title: string;
    location: string;
    workPattern: WorkPattern;
    contractType: ContractType;
    description?: string;
  },
  settings: Settings,
): { keep: boolean; reason: string | null; europeRemote: boolean } {
  const legal = practisingQualificationReason(input.title, input.description);
  if (legal) return { keep: false, reason: legal, europeRemote: false };

  const junior = juniorTitleReason(input.title);
  if (junior) return { keep: false, reason: junior, europeRemote: false };

  const phrases = enabledPhrases(settings);
  const matched = phrases.some((phrase) => titleMatchesPhrase(input.title, phrase));
  if (!matched) {
    return { keep: false, reason: "Title is outside the enabled search tiers", europeRemote: false };
  }

  if (!settings.contractTypes[input.contractType]) {
    return { keep: false, reason: `Contract type ${input.contractType} is turned off`, europeRemote: false };
  }

  const location = assessLocation(input);
  if (location.drop) return { keep: false, reason: location.reason ?? "Outside location", europeRemote: false };
  return { keep: true, reason: null, europeRemote: location.europeRemote };
}
