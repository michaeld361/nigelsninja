import type { RawJob, SearchParams } from "@/lib/types";
import { fixtureJobs } from "../fixtures";
import { prefilterJob } from "../prefilter";
import { defaultSettings } from "@/lib/defaults";
import type { SourceResult } from "./types";

type ReedHit = {
  jobId: number;
  jobTitle: string;
  employerName: string;
  locationName: string;
  minimumSalary?: number;
  maximumSalary?: number;
  currency?: string;
  date?: string;
  jobDescription?: string;
  jobUrl?: string;
  expirationDate?: string;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchReed(params: SearchParams): Promise<SourceResult> {
  if (!process.env.REED_API_KEY) {
    const jobs = fixtureJobs("reed").filter((job) => Date.now() - new Date(job.postedAt).getTime() <= params.lookbackHours * 3600 * 1000);
    return { source: "reed", jobs, demo: true, error: null, fetched: jobs.length };
  }
  try {
    const auth = Buffer.from(`${process.env.REED_API_KEY}:`).toString("base64");
    const jobs: RawJob[] = [];
    const phrases = params.phrases.slice(0, 12);
    for (const phrase of phrases) {
      const url = new URL("https://www.reed.co.uk/api/1.0/search");
      url.searchParams.set("keywords", phrase);
      url.searchParams.set("locationName", "London");
      url.searchParams.set("distanceFromLocation", String(params.radiusMiles));
      url.searchParams.set("resultsToTake", "20");
      const response = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
      if (!response.ok) throw new Error(`Reed search ${response.status}`);
      const body = (await response.json()) as { results?: ReedHit[] };
      for (const hit of body.results ?? []) {
        const rough = {
          title: hit.jobTitle,
          location: hit.locationName,
          workPattern: "hybrid" as const,
          contractType: "permanent" as const,
        };
        const gate = prefilterJob(rough, { ...defaultSettings(), tiers: defaultSettings().tiers });
        let description = hit.jobDescription || "";
        if (gate.keep) {
          await sleep(1100);
          const detail = await fetch(`https://www.reed.co.uk/api/1.0/jobs/${hit.jobId}`, {
            headers: { Authorization: `Basic ${auth}` },
          });
          if (detail.ok) {
            const full = (await detail.json()) as { jobDescription?: string };
            description = full.jobDescription || description;
          }
        }
        jobs.push({
          source: "reed",
          externalId: String(hit.jobId),
          title: hit.jobTitle,
          company: hit.employerName,
          location: hit.locationName,
          description,
          listingUrl: hit.jobUrl || `https://www.reed.co.uk/jobs/${hit.jobId}`,
          postedAt: hit.date || new Date().toISOString(),
          salaryMin: hit.minimumSalary ?? null,
          salaryMax: hit.maximumSalary ?? null,
          currency: hit.currency || "GBP",
          salaryPeriod: "year",
          closesAt: hit.expirationDate ?? null,
          demo: false,
          publisher: "Reed.co.uk",
        });
      }
      await sleep(1100);
    }
    return { source: "reed", jobs, demo: false, error: null, fetched: jobs.length };
  } catch (error) {
    return { source: "reed", jobs: [], demo: false, error: error instanceof Error ? error.message : "Reed source failed", fetched: 0 };
  }
}
