import type { RawJob, SearchParams } from "@/lib/types";
import { fixtureJobs } from "../fixtures";
import type { SourceResult } from "./types";

type JSearchJob = {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_country?: string;
  job_description?: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_publisher?: string;
  job_posted_at_datetime_utc?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
  job_is_remote?: boolean;
};

export async function searchJSearch(params: SearchParams): Promise<SourceResult> {
  if (!process.env.RAPIDAPI_KEY) {
    const jobs = fixtureJobs("jsearch").filter((job) => Date.now() - new Date(job.postedAt).getTime() <= params.lookbackHours * 3600 * 1000);
    return { source: "jsearch", jobs, demo: true, error: null, fetched: jobs.length };
  }
  try {
    const jobs: RawJob[] = [];
    const queries = params.phrases.slice(0, 10).map((phrase) => `${phrase} in London, UK`);
    for (const query of queries) {
      const url = new URL("https://jsearch.p.rapidapi.com/search");
      url.searchParams.set("query", query);
      url.searchParams.set("page", "1");
      url.searchParams.set("num_pages", "1");
      url.searchParams.set("date_posted", params.lookbackHours <= 24 ? "today" : "week");
      url.searchParams.set("country", "gb");
      const response = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });
      if (!response.ok) throw new Error(`JSearch ${response.status}`);
      const body = (await response.json()) as { data?: JSearchJob[] };
      for (const hit of body.data ?? []) {
        if (!hit.job_title || !hit.employer_name) continue;
        const period =
          hit.job_salary_period === "HOUR" ? "hour" : hit.job_salary_period === "DAY" ? "day" : hit.job_min_salary ? "year" : null;
        jobs.push({
          source: "jsearch",
          externalId: hit.job_id || `${hit.employer_name}-${hit.job_title}`,
          title: hit.job_title,
          company: hit.employer_name,
          location: [hit.job_city, hit.job_country, hit.job_is_remote ? "remote" : ""].filter(Boolean).join(", "),
          description: hit.job_description || "",
          listingUrl: hit.job_google_link || hit.job_apply_link || "",
          applyUrl: hit.job_apply_link || hit.job_google_link || "",
          postedAt: hit.job_posted_at_datetime_utc || new Date().toISOString(),
          salaryMin: hit.job_min_salary ?? null,
          salaryMax: hit.job_max_salary ?? null,
          currency: hit.job_salary_currency ?? null,
          salaryPeriod: period,
          workPattern: hit.job_is_remote ? "remote" : null,
          demo: false,
          publisher: hit.job_publisher ?? null,
        });
      }
    }
    return { source: "jsearch", jobs, demo: false, error: null, fetched: jobs.length };
  } catch (error) {
    return {
      source: "jsearch",
      jobs: [],
      demo: false,
      error: error instanceof Error ? error.message : "JSearch source failed",
      fetched: 0,
    };
  }
}
