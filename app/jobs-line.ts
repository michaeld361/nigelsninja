"use server";

import Anthropic from "@anthropic-ai/sdk";
import { acceptJobsLine } from "@/lib/jobs-line";

export async function draftJobsLine(input: {
  count: number;
  titles: string[];
  places: string[];
  fallback: string;
}): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY || input.count < 1) return input.fallback;
  const titles = input.titles.slice(0, 8).map((title) => title.replace(/\s+/g, " ").trim().slice(0, 80));
  const places = input.places.slice(0, 8).map((place) => place.replace(/\s+/g, " ").trim().slice(0, 40));
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create(
      {
        model: "claude-haiku-4-5",
        max_tokens: 80,
        system: "You write a single warm, plain sentence for a private job list. No slogan, no apology, no question.",
        messages: [
          {
            role: "user",
            content: `There are ${input.count} roles. Titles: ${titles.join("; ") || "privacy"}. Places: ${places.join("; ") || "unspecified"}. Write one sentence of at most 22 words. It must contain the numeral ${input.count}. Mention the kind of work only if the titles support it.`,
          },
        ],
      },
      { signal: AbortSignal.timeout(1200) },
    );
    const block = response.content.find((part) => part.type === "text");
    const text = block && block.type === "text" ? block.text.replace(/^["']+|["']+$/g, "").replace(/\s+/g, " ").trim() : "";
    return acceptJobsLine(text, input.count) ? text : input.fallback;
  } catch {
    return input.fallback;
  }
}
