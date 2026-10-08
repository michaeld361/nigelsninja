import type { RawJob, SearchParams, SourceId } from "@/lib/types";

export type SourceResult = {
  source: SourceId;
  jobs: RawJob[];
  demo: boolean;
  error: string | null;
  fetched: number;
  capHits?: string[];
};

export type JobSource = {
  id: SourceId;
  search(params: SearchParams): Promise<SourceResult>;
};
