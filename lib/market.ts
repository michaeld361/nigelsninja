import type { Job, Store } from "./types";
import { formatClock, formatLongDate } from "./text";

export type MarketPoint = {
  at: string;
  label: string;
  found: number;
  searched: number;
};

export type MarketBar = { label: string; count: number };

export type MarketView = {
  points: MarketPoint[];
  historyNote: string;
  places: MarketBar[];
  asks: MarketBar[];
  repeating: MarketBar[];
  read: string[];
};

const ASK_THEMES: { label: string; pattern: RegExp; cv: RegExp; gap: string }[] = [
  { label: "OneTrust or a privacy tool", pattern: /onetrust|one trust/i, cv: /onetrust|one trust/i, gap: "OneTrust by name, if you have used it. The listings that want it are asking for the tool, not only the work around it." },
  { label: "AI governance", pattern: /artificial intelligence|\bAI\b|AIGP/i, cv: /AIGP|artificial intelligence|\bAI\b/i, gap: "A short AI governance line. AIGP is already there, and several specs now want the practice named beside it." },
  { label: "A practising lawyer", pattern: /\b(solicitor|barrister|counsel|qualified lawyer)\b/i, cv: /solicitor/i, gap: "" },
  { label: "DPIAs and privacy by design", pattern: /DPIA|privacy by design|privacy impact/i, cv: /DPIA|privacy by design/i, gap: "" },
  { label: "Records and retention", pattern: /record of processing|RoPA|information governance|retention|data inventory/i, cv: /record of processing|RoPA|data inventory/i, gap: "" },
  { label: "Breaches", pattern: /breach/i, cv: /breach/i, gap: "" },
  { label: "Vendors and contracts", pattern: /vendor|supplier|\bDPA\b|due diligence/i, cv: /vendor|DPA|due diligence/i, gap: "" },
  { label: "International transfers", pattern: /SCC|IDTA|transfer|international|cross-border/i, cv: /SCC|IDTA|APAC|LATAM/i, gap: "" },
  { label: "Training the business", pattern: /training|awareness/i, cv: /training/i, gap: "" },
];

export function marketView(store: Store): MarketView {
  const points = chartPoints(store);
  const jobs = store.jobs.filter((job) => !job.demo && job.sources.some((source) => source.source === "linkedin") && job.descriptionText.trim());
  const profile = `${store.profile.cvText}\n${store.profile.linkedinSummary}\n${store.profile.personalStatement}`;
  const asks = countAsks(jobs);
  const places = countPlaces(jobs.filter((job) => job.status !== "filtered"));
  const repeating = countTitles(jobs.filter((job) => job.status !== "filtered"));
  return {
    points,
    historyNote: historyNote(points.length),
    places,
    asks,
    repeating,
    read: localRead(points, asks, places, repeating, profile),
  };
}

function chartPoints(store: Store): MarketPoint[] {
  return store.runs
    .filter((run) => run.finishedAt)
    .slice()
    .sort((a, b) => (a.finishedAt || "").localeCompare(b.finishedAt || ""))
    .map((run) => ({
      at: run.finishedAt || run.startedAt,
      label: `${formatLongDate(run.finishedAt || run.startedAt).replace(/ \d{4}$/, "")}, ${formatClock(run.finishedAt || run.startedAt)}`,
      found: run.totals.worthALook,
      searched: run.counts.linkedin?.fetched ?? run.totals.fetched,
    }));
}

export function historyNote(count: number): string {
  if (count === 0) return "No search has finished yet. The first point appears after the next LinkedIn look.";
  if (count === 1) return "One search so far. Each look, including the one every two hours, adds a point.";
  if (count < 4) return `A short history, ${count} searches. The line will mean more as the two-hour looks accumulate.`;
  return "Each point is one LinkedIn search, and the height is how many roles passed the filters.";
}

function countAsks(jobs: Job[]): MarketBar[] {
  return ASK_THEMES.map((theme) => ({
    label: theme.label,
    count: jobs.filter((job) => theme.pattern.test(`${job.title}\n${job.descriptionText}`)).length,
  }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function countPlaces(jobs: Job[]): MarketBar[] {
  const buckets = new Map<string, number>();
  for (const job of jobs) {
    const label = placeLabel(job);
    buckets.set(label, (buckets.get(label) || 0) + 1);
  }
  return [...buckets.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function placeLabel(job: Job): string {
  const location = job.location.toLowerCase();
  if (job.workPattern === "remote" || /\bremote\b/.test(location)) return job.europeRemote ? "Remote, Europe" : "Remote, UK";
  if (job.workPattern === "hybrid" || /hybrid/.test(location)) return "Hybrid, London area";
  if (/london/.test(location)) return "London, on site";
  return job.location.split(",")[0] || "Other";
}

function countTitles(jobs: Job[]): MarketBar[] {
  const buckets = new Map<string, number>();
  for (const job of jobs) {
    const label = titleGroup(job.title);
    buckets.set(label, (buckets.get(label) || 0) + 1);
  }
  return [...buckets.entries()]
    .map(([label, count]) => ({ label, count }))
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function titleGroup(title: string): string {
  if (/data protection officer|\bDPO\b/i.test(title)) return "Data Protection Officer";
  if (/privacy manager|data privacy manager/i.test(title)) return "Privacy manager";
  if (/head of privacy|head of data/i.test(title)) return "Head of privacy";
  if (/information governance|records/i.test(title)) return "Information governance";
  if (/compliance manager/i.test(title)) return "Compliance manager";
  return title;
}

function localRead(points: MarketPoint[], asks: MarketBar[], places: MarketBar[], repeating: MarketBar[], profile: string): string[] {
  const paragraphs: string[] = [];
  if (!points.length) {
    return ["There is not a trend to read yet. It starts when the first LinkedIn search has finished."];
  }
  const latest = points[points.length - 1];
  const found = points.reduce((sum, point) => sum + point.found, 0);
  paragraphs.push(
    points.length < 4
      ? `Across ${points.length} ${points.length === 1 ? "search" : "searches"} we have kept ${found} ${found === 1 ? "role" : "roles"} that passed the filters. The latest look found ${latest.found}. That is the whole picture so far, not a wider market claim.`
      : `The latest look found ${latest.found} ${latest.found === 1 ? "role" : "roles"} after the filters, out of ${latest.searched} listings. The earlier points are the searches we have actually run.`,
  );
  const leadAsk = asks.filter((item) => item.label !== "A practising lawyer")[0];
  const lawyer = asks.find((item) => item.label === "A practising lawyer");
  const place = places[0];
  const bits = [
    leadAsk ? `${leadAsk.label} shows up in ${leadAsk.count} of the listings we have fetched.` : "",
    place ? `The roles we kept sit mostly as ${place.label.toLowerCase()} (${place.count}).` : "",
    repeating[0] ? `${repeating[0].label} is the title that keeps returning (${repeating[0].count}).` : "",
    lawyer && lawyer.count > 0 ? `${lawyer.count} ${lawyer.count === 1 ? "listing still asks" : "listings still ask"} for a practising lawyer. Those stay off the Jobs list.` : "",
  ].filter(Boolean);
  if (bits.length) paragraphs.push(bits.join(" "));
  const gaps = ASK_THEMES.filter((theme) => theme.gap && asks.some((item) => item.label === theme.label && item.count >= 2) && !theme.cv.test(profile));
  if (gaps.length) {
    paragraphs.push(`Worth adding to the CV, because it is in the specs and not obvious on yours: ${gaps.map((gap) => gap.gap).join(" ")}`);
  } else if (leadAsk) {
    paragraphs.push("Nothing in these listings asks for a credential you do not already hold. The useful move is to bring CIPP/E, CIPM, AIGP, and the operating work at MullenLowe, forward in the letter rather than adding a new claim.");
  }
  return paragraphs;
}
