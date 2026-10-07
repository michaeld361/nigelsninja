import type { Settings } from "./types";

export const ALLOWED_USERS = [
  { email: "nigel@nigeldown.com", role: "candidate" as const, name: "Nigel Down" },
  { email: "mail@michaeldown.co.uk", role: "admin" as const, name: "Michael Down" },
];

export const CORE_PHRASES = [
  "Data Privacy Manager",
  "Data Protection Manager",
  "Senior Data Protection Specialist",
  "Data Protection Officer",
  "DPO",
  "Head of Data Protection",
  "Head of Privacy",
  "Privacy Senior Manager",
  "Privacy Operations Lead",
  "Group Data Compliance Manager",
];

export const ADJACENT_PHRASES = [
  "Information Governance Manager",
  "Data Governance Lead",
  "Data Governance Assistant Director",
  "AI Governance Lead",
  "People Data & Governance Lead",
  "People Data and Governance Lead",
  "Compliance Manager",
  "Legal & Compliance Senior Manager",
  "Legal and Compliance Senior Manager",
  "Privacy Programme Manager",
];

export const STRETCH_PHRASES = [
  "Client Data Manager",
  "Master Data Manager",
  "Operations Director",
  "Programme Director",
  "Compliance operations",
];

export const DEFAULT_DISCLAIMER =
  "This letter was drafted with AI assistance and reviewed and edited by me; all experience and achievements are my own.";

export const DEFAULT_STANDING_NOTES =
  "Business-like and conversational, not too warm. Do not use em dashes or en dashes. Mention the Mantle dashboard at most once, and only as supporting evidence. Write in UK English. He is not a qualified solicitor.";

export function defaultSettings(): Settings {
  return {
    tiers: [
      { id: "core", label: "Core", enabled: true, phrases: [...CORE_PHRASES] },
      { id: "adjacent", label: "Adjacent", enabled: true, phrases: [...ADJACENT_PHRASES] },
      { id: "stretch", label: "Stretch", enabled: false, phrases: [...STRETCH_PHRASES] },
    ],
    homePostcode: "N22 5QA",
    radiusMiles: 40,
    locations: [
      { label: "London", mode: "radius" },
      { label: "United Kingdom", mode: "remote" },
    ],
    contractTypes: {
      permanent: true,
      "fixed-term": true,
      contract: true,
      "part-time": true,
      freelance: true,
    },
    scoreThreshold: 60,
    standingNotes: DEFAULT_STANDING_NOTES,
    digestEnabled: true,
    disclaimerEnabled: true,
    disclaimerText: DEFAULT_DISCLAIMER,
    monthlySpendCeilingUsd: 120,
  };
}

export const SCORE_PROMPT_VERSION = "score-v1";
export const LETTER_PROMPT_VERSION = "letter-v1";

export const LONDON_RADIUS = [
  "london",
  "reading",
  "slough",
  "watford",
  "st albans",
  "guildford",
  "chelmsford",
  "luton",
  "maidenhead",
  "windsor",
  "farnborough",
  "woking",
  "croydon",
  "uxbridge",
  "bromley",
  "kingston",
  "richmond",
  "ealing",
  "barnet",
  "harrow",
  "hounslow",
  "greenwich",
  "lewisham",
  "southwark",
  "camden",
  "islington",
  "hackney",
  "newham",
  "redbridge",
  "bexley",
  "sutton",
  "merton",
  "enfield",
  "haringey",
  "wandsworth",
  "hammersmith",
  "kensington",
  "chelsea",
  "lambeth",
  "brent",
  "ilford",
  "romford",
  "dartford",
  "sevenoaks",
  "wycombe",
  "bracknell",
  "epsom",
  "stevenage",
  "hatfield",
  "welwyn",
  "amersham",
  "beaconsfield",
  "hemel",
  "wood green",
];

export const OUTSIDE_CITIES = [
  "leeds",
  "manchester",
  "birmingham",
  "edinburgh",
  "glasgow",
  "bristol",
  "cardiff",
  "newcastle",
  "liverpool",
  "sheffield",
  "nottingham",
  "belfast",
  "aberdeen",
];

export const EUROPE_PLACES = [
  "amsterdam",
  "netherlands",
  "berlin",
  "germany",
  "paris",
  "france",
  "dublin",
  "brussels",
  "belgium",
  "madrid",
  "spain",
  "lisbon",
  "portugal",
  "stockholm",
  "sweden",
  "copenhagen",
  "denmark",
  "warsaw",
  "poland",
  "prague",
  "munich",
  "frankfurt",
  "zurich",
  "geneva",
  "switzerland",
  "milan",
  "rome",
  "italy",
  "barcelona",
  "vienna",
  "austria",
  "luxembourg",
  "europe",
];

export const RUN_CAPS = { scored: 80, letters: 30 };

export const CONTACT = {
  name: "Nigel Down",
  title: "Data Privacy Professional",
  certLine: "CIPP/E, CIPM, AIGP",
  address: ["17 Leith Road", "London N22 5QA"],
  phone: "07795633377",
  email: "nigel@nigeldown.com",
  linkedin: "www.linkedin.com/in/nigeldown",
};
