import { ApifyClient } from "apify-client";
import type { ContractType, RawJob, SalaryPeriod, SearchParams, WorkPattern } from "@/lib/types";
import { fixtureJobs } from "../fixtures";
import { chunkBudget, chunkPhrases, rowCapNotes, rowsForLookback } from "../search-plan";
import type { SourceResult } from "./types";

type ActorItem = {
  id?: string;
  title?: string;
  companyName?: string;
  location?: string;
  description?: string;
  descriptionText?: string;
  jobUrl?: string;
  link?: string;
  applyUrl?: string;
  publishedAt?: string;
  postedAt?: string;
  postedAtTimestamp?: number;
  salary?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  contractType?: string | null;
  workType?: string | null;
  posterFullName?: string | null;
};

export async function searchLinkedIn(params: SearchParams): Promise<SourceResult> {
  if (!process.env.APIFY_TOKEN) {
    const jobs = fixtureJobs("linkedin").filter((job) => within(job.postedAt, params.lookbackHours));
    return { source: "linkedin", jobs, demo: true, error: null, fetched: jobs.length };
  }
  try {
    const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
    const actor = process.env.APIFY_LINKEDIN_ACTOR || "bebity/linkedin-jobs-scraper";
    const locations = params.locations.map((location) => location.label).slice(0, 2);
    const rows = rowsForLookback(params.lookbackHours);
    const publishedAt = params.lookbackHours <= 24 ? "r86400" : "r604800";
    const chunks = chunkPhrases(params.phrases);
    const budget = chunkBudget(params.lookbackHours, chunks.length);
    const jobs: RawJob[] = [];
    const seen = new Set<string>();
    const capHits: string[] = [];
    const errors: string[] = [];
    for (const titles of chunks) {
      try {
        const run = await client.actor(actor).call(
          {
            titles,
            locations,
            publishedAt,
            rows,
            companyProfile: true,
            enrichCompany: false,
          },
          { waitSecs: 180, maxItems: budget.maxItems, maxTotalChargeUsd: budget.usd },
        );
        const dataset = await client.dataset(run.defaultDatasetId).listItems();
        const items = (dataset.items as ActorItem[]).filter((item) => item.title && item.companyName);
        const phraseCounts = countByPhrase(items, titles);
        const notes = rowCapNotes({ phrases: titles, locations, rows, returned: items.length, phraseCounts });
        for (const note of notes) {
          capHits.push(note);
          console.log(JSON.stringify({ event: "linkedin-row-cap", note, rows, phrases: titles }));
        }
        for (const item of items) {
          const listingUrl = item.jobUrl || item.link || "";
          const externalId = String(item.id || listingUrl || `${item.companyName}-${item.title}`);
          if (seen.has(externalId)) continue;
          seen.add(externalId);
          const postedAt = listingDate(item);
          const poster = item.posterFullName ? `\n\nPosted on LinkedIn by ${item.posterFullName}.` : "";
          jobs.push({
            source: "linkedin",
            externalId,
            title: item.title || "",
            company: item.companyName || "",
            location: item.location || "",
            description: `${item.descriptionText || item.description || ""}${poster}`.trim(),
            listingUrl,
            applyUrl: item.applyUrl || listingUrl,
            postedAt,
            salaryMin: numberOrNull(item.salaryMin),
            salaryMax: numberOrNull(item.salaryMax),
            salaryPeriod: period(item.salaryPeriod),
            currency: item.salaryCurrency || "GBP",
            contractType: contract(item.contractType),
            workPattern: pattern(item.workType),
            demo: false,
            publisher: "LinkedIn",
          });
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "LinkedIn source failed");
      }
    }
    return {
      source: "linkedin",
      jobs,
      demo: false,
      error: errors.length && !jobs.length ? errors[0] : null,
      fetched: jobs.length,
      capHits,
    };
  } catch (error) {
    return {
      source: "linkedin",
      jobs: [],
      demo: false,
      error: error instanceof Error ? error.message : "LinkedIn source failed",
      fetched: 0,
    };
  }
}

function countByPhrase(items: ActorItem[], phrases: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const raw = item as ActorItem & Record<string, unknown>;
    const hint = ["searchTitle", "query", "keyword", "titleQuery", "searchQuery"]
      .map((key) => raw[key])
      .find((value): value is string => typeof value === "string" && value.length > 0);
    if (!hint) continue;
    const phrase = phrases.find((title) => hint.toLowerCase().includes(title.toLowerCase())) || hint;
    counts.set(phrase, (counts.get(phrase) || 0) + 1);
  }
  return counts;
}

function listingDate(item: ActorItem): string {
  if (item.postedAtTimestamp) return new Date(item.postedAtTimestamp).toISOString();
  const raw = item.publishedAt || item.postedAt || "";
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function within(postedAt: string, lookbackHours: number): boolean {
  return Date.now() - new Date(postedAt).getTime() <= lookbackHours * 60 * 60 * 1000;
}

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function period(value: string | null | undefined): SalaryPeriod | null {
  const text = (value || "").toLowerCase();
  if (text.includes("hour")) return "hour";
  if (text.includes("day")) return "day";
  if (text.includes("year") || text.includes("annual")) return "year";
  return null;
}

function contract(value: string | null | undefined): ContractType | null {
  const text = (value || "").toLowerCase();
  if (text.includes("part")) return "part-time";
  if (text.includes("contract") || text.includes("temporary")) return "contract";
  if (text.includes("full")) return "permanent";
  return null;
}

function pattern(value: string | null | undefined): WorkPattern | null {
  const text = (value || "").toLowerCase();
  if (text.includes("remote")) return "remote";
  if (text.includes("hybrid")) return "hybrid";
  if (text.includes("site") || text.includes("on-site") || text.includes("onsite")) return "on-site";
  return null;
}
