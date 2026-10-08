async function main() {
  const kind = process.argv[2] === "linkedin" ? "linkedin" : "morning";
  const base = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").trim().replace(/\/$/, "");
  const secret = process.env.CRON_SECRET || "";

  if (!base || !secret) {
    console.log(JSON.stringify({ ok: false, error: "APP_URL or CRON_SECRET is not set" }));
    process.exit(1);
  }

  const response = await fetch(`${base}/api/cron/${kind}`, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await response.text();
  console.log(body.split(secret).join(""));
  if (!response.ok) process.exit(1);
}

main().catch(() => {
  console.log(JSON.stringify({ ok: false, error: "The cron call did not finish." }));
  process.exit(1);
});
