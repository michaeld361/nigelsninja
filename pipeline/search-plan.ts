/** bebity/linkedin-jobs-scraper: each title × location is its own search, rows capped at 1,000. */
export const PHRASE_CHUNK = 8;
export const STEADY_ROWS = 200;
export const BACKFILL_ROWS = 1000;
export const RUNS_PER_DAY = 12;
export const ROW_USD_PER_THOUSAND = 1.25;
export const STEADY_MAX_USD = 2;
export const BACKFILL_MAX_USD = 5;
export const STARTER_CREDIT_USD = 19;

export function chunkPhrases<T>(items: T[], size = PHRASE_CHUNK): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export function rowsForLookback(hours: number): number {
  return hours >= 24 * 7 ? BACKFILL_ROWS : STEADY_ROWS;
}

export function runBudget(hours: number): { usd: number; maxItems: number } {
  const usd = hours >= 24 * 7 ? BACKFILL_MAX_USD : STEADY_MAX_USD;
  return { usd, maxItems: Math.floor((usd / ROW_USD_PER_THOUSAND) * 1000) };
}

export function chunkBudget(hours: number, chunks: number): { usd: number; maxItems: number } {
  const total = runBudget(hours);
  const count = Math.max(1, chunks);
  return {
    usd: Math.round((total.usd / count) * 100) / 100,
    maxItems: Math.max(1, Math.floor(total.maxItems / count)),
  };
}

export function expectedSearchLoad(phraseCount: number, locationCount: number, rows = STEADY_ROWS) {
  const phrases = Math.max(0, phraseCount);
  const locations = Math.max(1, locationCount);
  const perRun = phrases * locations * rows;
  const perDay = perRun * RUNS_PER_DAY;
  return {
    chunks: phrases ? Math.ceil(phrases / PHRASE_CHUNK) : 0,
    phrases,
    locations,
    perRun,
    perDay,
    usdPerDay: RUNS_PER_DAY * STEADY_MAX_USD,
    steadyCapUsd: STEADY_MAX_USD,
    backfillCapUsd: BACKFILL_MAX_USD,
    uncappedUsdPerRun: (perRun / 1000) * ROW_USD_PER_THOUSAND,
  };
}

export function rowCapNotes(input: {
  phrases: string[];
  locations: string[];
  rows: number;
  returned: number;
  phraseCounts?: Map<string, number>;
}): string[] {
  const notes: string[] = [];
  const places = Math.max(1, input.locations.length);
  if (input.phraseCounts && input.phraseCounts.size) {
    for (const [phrase, count] of input.phraseCounts) {
      if (count >= input.rows * places) {
        notes.push(`${phrase} returned ${count} rows, the cap of ${input.rows} per place. More roles were not seen.`);
      }
    }
  }
  const ceiling = input.phrases.length * places * input.rows;
  if (input.returned >= ceiling && ceiling > 0) {
    const label = input.phrases.join("; ");
    notes.push(`Phrase group (${label}) returned ${input.returned} rows, the cap of ${ceiling}. More roles were not seen.`);
  }
  return notes;
}
