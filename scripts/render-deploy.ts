import fs from "fs";
import path from "path";

function loadEnv() {
  const file = path.join(process.cwd(), ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Z0-9_]+$/.test(key) || process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

function present(name: string): boolean {
  return Boolean(process.env[name] && process.env[name]!.trim());
}

const CARRIED = ["APIFY_TOKEN", "ANTHROPIC_API_KEY", "RESEND_API_KEY", "WRITING_MODEL", "APIFY_LINKEDIN_ACTOR", "SCORING_MODEL"] as const;

type RenderService = { id?: string; name?: string; serviceDetails?: { url?: string }; url?: string };

function serviceOf(row: unknown): RenderService {
  if (!row || typeof row !== "object") return {};
  const record = row as { service?: RenderService };
  return record.service || (row as RenderService);
}

async function main() {
  loadEnv();
  const needed = ["RENDER_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((name) => !present(name));
  if (needed.length) {
    console.log(JSON.stringify({ deployed: false, missing: needed, supabaseUsed: false }));
    return;
  }
  const key = process.env.RENDER_API_KEY || "";
  const headers = { authorization: `Bearer ${key}`, accept: "application/json", "content-type": "application/json" };
  const listed = await fetch("https://api.render.com/v1/services?limit=50", { headers });
  if (!listed.ok) {
    console.log(JSON.stringify({ deployed: false, error: `Render service list failed (${listed.status})` }));
    return;
  }
  const rows = (await listed.json()) as unknown[];
  const services = Array.isArray(rows) ? rows.map(serviceOf) : [];
  const web = services.find((item) => item.name === "nigelsninja");
  if (!web?.id) {
    console.log(JSON.stringify({
      deployed: false,
      error: "No nigelsninja service yet. render.yaml is ready. Render has to clone this repo from GitHub or GitLab; the current origin is not one of those.",
    }));
    return;
  }
  const current = await fetch(`https://api.render.com/v1/services/${web.id}/env-vars`, { headers });
  const existingRows = current.ok ? ((await current.json()) as unknown[]) : [];
  const merged = new Map<string, string>();
  for (const row of Array.isArray(existingRows) ? existingRows : []) {
    const item = (row && typeof row === "object" && "envVar" in row ? (row as { envVar?: { key?: string; value?: string } }).envVar : row) as { key?: string; value?: string };
    if (item?.key && typeof item.value === "string") merged.set(item.key, item.value);
  }
  for (const name of CARRIED) if (present(name)) merged.set(name, process.env[name] || "");
  const url = web.serviceDetails?.url || web.url;
  if (url) merged.set("APP_URL", url);
  const updated = await fetch(`https://api.render.com/v1/services/${web.id}/env-vars`, {
    method: "PUT",
    headers,
    body: JSON.stringify([...merged.entries()].map(([key, value]) => ({ key, value }))),
  });
  if (!updated.ok) {
    console.log(JSON.stringify({ deployed: false, error: `Render env update failed (${updated.status})` }));
    return;
  }
  const deploy = await fetch(`https://api.render.com/v1/services/${web.id}/deploys`, { method: "POST", headers, body: "{}" });
  console.log(JSON.stringify({ deployed: deploy.ok, url: url || null, envStatus: updated.status, deployStatus: deploy.status }));
}

main().catch(() => {
  console.log(JSON.stringify({ deployed: false, error: "Render deploy did not finish." }));
});
