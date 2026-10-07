import fs from "fs";
import path from "path";
import { sendMorningEmail } from "./morning-email";

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

async function main() {
  loadEnv();
  const result = await sendMorningEmail();
  const secret = process.env.RESEND_API_KEY;
  let error = result.error || null;
  if (secret && error) error = error.split(secret).join("");
  console.log(JSON.stringify({ sent: result.sent, subject: result.subject, error }));
  if (!result.sent) process.exit(1);
}

main().catch(() => {
  console.log(JSON.stringify({ sent: false, error: "The send did not finish." }));
  process.exit(1);
});
