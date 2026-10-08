import http from "node:http";
import https from "node:https";
import { CRON_DEADLINE_MS, CRON_HTTP_MS, CRON_POLL_MS } from "../lib/cron-wait";

function request(url: string, method: "GET" | "POST", secret: string, timeoutMs: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "http:" ? http : https;
    const call = transport.request(
      target,
      { method, headers: { authorization: `Bearer ${secret}` } },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
        });
      },
    );
    call.setTimeout(timeoutMs, () => {
      call.destroy(new Error("The cron call did not answer in time."));
    });
    call.on("error", reject);
    call.end();
  });
}

function quiet(body: string, secret: string): string {
  return secret ? body.split(secret).join("") : body;
}

async function main() {
  const kind = process.argv[2] === "linkedin" ? "linkedin" : "morning";
  const base = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").trim().replace(/\/$/, "");
  const secret = process.env.CRON_SECRET || "";

  if (!base || !secret) {
    console.log(JSON.stringify({ ok: false, error: "APP_URL or CRON_SECRET is not set" }));
    process.exit(1);
  }

  const started = Date.now();
  const posted = await request(`${base}/api/cron/${kind}`, "POST", secret, kind === "linkedin" ? CRON_HTTP_MS : 3 * 60 * 1000);
  const postedBody = quiet(posted.body, secret);
  console.log(postedBody);
  if (posted.status < 200 || posted.status >= 300) process.exit(1);
  if (kind !== "linkedin") return;
  try {
    const startedBody = JSON.parse(postedBody) as { skipped?: string };
    if (startedBody.skipped === "waiting") return;
  } catch {
    /* A body that is not JSON still gets polled. */
  }

  const deadline = started + CRON_DEADLINE_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, CRON_POLL_MS));
    const status = await request(`${base}/api/cron/linkedin`, "GET", secret, CRON_HTTP_MS);
    const body = quiet(status.body, secret);
    console.log(body);
    let parsed: { state?: string; finishedAt?: string | null } = {};
    try {
      parsed = JSON.parse(body) as { state?: string; finishedAt?: string | null };
    } catch {
      continue;
    }
    if (!parsed.finishedAt) continue;
    if (new Date(parsed.finishedAt).getTime() + 2000 < started) continue;
    if (parsed.state === "done") return;
    if (parsed.state === "failed") process.exit(1);
  }
  console.log(JSON.stringify({ ok: false, error: "The LinkedIn search did not finish in time." }));
  process.exit(1);
}

main().catch((error: unknown) => {
  const secret = process.env.CRON_SECRET || "";
  const message = error instanceof Error ? error.message : "The cron call did not finish.";
  console.log(JSON.stringify({ ok: false, error: secret ? message.split(secret).join("") : message }));
  process.exit(1);
});
