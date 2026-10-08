import http from "node:http";
import https from "node:https";
import { CRON_WAIT_MS } from "../lib/cron-wait";

function post(url: string, secret: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "http:" ? http : https;
    const request = transport.request(
      target,
      {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
        });
      },
    );
    request.setTimeout(CRON_WAIT_MS, () => {
      request.destroy(new Error("The search did not answer in time."));
    });
    request.on("error", reject);
    request.end();
  });
}

async function main() {
  const kind = process.argv[2] === "linkedin" ? "linkedin" : "morning";
  const base = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").trim().replace(/\/$/, "");
  const secret = process.env.CRON_SECRET || "";

  if (!base || !secret) {
    console.log(JSON.stringify({ ok: false, error: "APP_URL or CRON_SECRET is not set" }));
    process.exit(1);
  }

  const response = await post(`${base}/api/cron/${kind}`, secret);
  console.log(response.body.split(secret).join(""));
  if (response.status < 200 || response.status >= 300) process.exit(1);
}

main().catch((error: unknown) => {
  const secret = process.env.CRON_SECRET || "";
  const message = error instanceof Error ? error.message : "The cron call did not finish.";
  console.log(JSON.stringify({ ok: false, error: secret ? message.split(secret).join("") : message }));
  process.exit(1);
});
