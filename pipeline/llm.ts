import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function callClaude(input: {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  cacheSystem?: boolean;
}): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await anthropic().messages.create({
        model: input.model,
        max_tokens: input.maxTokens,
        system: input.cacheSystem
          ? [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }]
          : input.system,
        messages: [{ role: "user", content: input.user }],
      });
      const block = response.content.find((part) => part.type === "text");
      if (!block || block.type !== "text") throw new Error("Empty model response");
      const usage = response.usage;
      if (usage) {
        const rates = input.model.includes("fable") ? { in: 10, out: 50 } : { in: 2, out: 10 };
        const cost =
          ((usage.input_tokens ?? 0) * rates.in + (usage.output_tokens ?? 0) * rates.out) / 1_000_000;
        recordCost(cost);
      }
      return block.text;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Claude call failed");
}

export async function callClaudeWithWebSearch(input: {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}): Promise<{ text: string; searched: boolean }> {
  const tools = [
    {
      type: "web_search_20260209" as const,
      name: "web_search" as const,
      max_uses: 4,
      user_location: { type: "approximate" as const, city: "London", region: "England", country: "GB", timezone: "Europe/London" },
    },
  ];
  let response = await anthropic().messages.create({
    model: input.model,
    max_tokens: input.maxTokens,
    system: input.system,
    messages: [{ role: "user", content: input.user }],
    tools,
  });
  noteUsage(input.model, response.usage);
  if (response.stop_reason === "pause_turn") {
    response = await anthropic().messages.create({
      model: input.model,
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [
        { role: "user", content: input.user },
        { role: "assistant", content: response.content },
      ],
      tools,
    });
    noteUsage(input.model, response.usage);
  }
  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
  const searched = response.content.some((block) => block.type === "web_search_tool_result");
  if (!text) throw new Error("Empty model response");
  return { text, searched };
}

function noteUsage(model: string, usage: { input_tokens?: number | null; output_tokens?: number | null; server_tool_use?: { web_search_requests?: number | null } | null } | undefined) {
  if (!usage) return;
  const rates = model.includes("fable") ? { in: 10, out: 50 } : { in: 2, out: 10 };
  const tokens = ((usage.input_tokens ?? 0) * rates.in + (usage.output_tokens ?? 0) * rates.out) / 1_000_000;
  const searches = ((usage.server_tool_use?.web_search_requests ?? 0) * 10) / 1000;
  recordCost(tokens + searches);
}

let pendingCost = 0;
export function recordCost(amount: number) {
  pendingCost += amount;
}
export function takeCost(): number {
  const value = pendingCost;
  pendingCost = 0;
  return Math.round(value * 1000) / 1000;
}
