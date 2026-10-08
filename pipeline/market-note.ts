import type { MarketNote, Store } from "@/lib/types";
import { acceptMarketNote, marketFallback, marketNoteFacts } from "@/lib/market";
import { callClaude } from "./llm";

export async function writeMarketNote(store: Store, runId: string): Promise<MarketNote> {
  const facts = marketNoteFacts(store);
  let text = marketFallback(facts);
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const model = process.env.SCORING_MODEL || "claude-sonnet-5-5";
      const raw = await callClaude({
        model,
        maxTokens: 420,
        system:
          "You write a short warm note for Nigel about the privacy roles his search just kept. Two or three sentences. Say what the roles are asking for, and any real pattern in titles, skills, places, or contract types. Use only the facts you are given. Do not invent employers, salaries, or counts that are not in the facts. No prices. Plain sentences.",
        user: JSON.stringify(facts),
      });
      const accepted = acceptMarketNote(raw);
      if (accepted) text = accepted;
    } catch {
      /* The search still stores the local note, so the page can refresh without a model. */
    }
  }
  return { text, writtenAt: new Date().toISOString(), runId };
}
