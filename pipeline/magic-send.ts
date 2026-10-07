import fs from "fs";
import path from "path";
import { magicLinkEmail } from "./brand-email";
import { sendEmail } from "./notify";
import { updateStore } from "@/lib/store";

const TO = "mail@michaeldown.co.uk";

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
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  if (!base || /127\.0\.0\.1|localhost/i.test(base)) {
    console.log(JSON.stringify({ sent: false, subject: "Sign in to nigelsninja", error: "APP_URL is missing or points at this machine, so the email was not sent." }));
    process.exit(1);
  }
  const token = crypto.randomUUID();
  updateStore((store) => {
    store.magicLinks.push({
      token,
      email: TO,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      used: false,
    });
  });
  const mail = magicLinkEmail(`${base}/login/consume?token=${token}`);
  const result = await sendEmail(TO, mail.subject, mail.html);
  let error = result.error || null;
  const secret = process.env.RESEND_API_KEY;
  if (secret && error) error = error.split(secret).join("");
  console.log(JSON.stringify({ sent: result.sent, subject: mail.subject, to: TO, error }));
  if (!result.sent) process.exit(1);
}

main().catch(() => {
  console.log(JSON.stringify({ sent: false, error: "The send did not finish." }));
  process.exit(1);
});
