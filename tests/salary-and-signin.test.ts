import assert from "node:assert/strict";
import test from "node:test";
import { salaryLabel } from "../lib/format";
import { groundJobSalary, groundStoredPay } from "../lib/salary";
import { parseSalary } from "../lib/text";
import type { FitAssessment, Job } from "../lib/types";
import { resendFrom, sendEmail } from "../pipeline/notify";
import { sessionCookie } from "../lib/auth";

test("a competitive posting shows no salary, even when a scraper stored $8k", () => {
  const description = "SALARY: Competitive\n\nABM UK is hiring a Data Protection Officer in Hounslow.";
  const job = {
    descriptionText: description,
    salaryMin: 8000,
    salaryMax: 8000,
    salaryPeriod: "year" as const,
    currency: "USD",
  };
  assert.equal(parseSalary(description).salaryMin, null);
  assert.equal(salaryLabel(job), "");
  assert.equal(groundJobSalary(job), true);
  assert.equal(job.salaryMin, null);
  assert.equal(job.salaryMax, null);
  assert.equal(job.currency, null);
  assert.equal(salaryLabel({ descriptionText: description }), "");
});

test("a figure written in the posting is the salary that shows", () => {
  const description = "Permanent. Salary £70,000 to £85,000.";
  const label = salaryLabel({ descriptionText: description });
  assert.match(label, /£70k/);
  assert.match(label, /£85k/);
  assert.equal(label.includes("$"), false);
});

test("stored rows lose a salary the description does not state", () => {
  const job = {
    id: "abm",
    descriptionText: "SALARY: Competitive",
    salaryMin: 8000,
    salaryMax: 8000,
    salaryPeriod: "year" as const,
    currency: "USD",
  } as Job;
  const stated = {
    id: "monzo",
    descriptionText: "Salary £70,000 to £85,000.",
    salaryMin: 1,
    salaryMax: 1,
    salaryPeriod: null,
    currency: "USD",
  } as Job;
  const fit = { jobId: "abm", salaryNote: "Stated pay is $8,000 a year." } as FitAssessment;
  const changed = groundStoredPay({ jobs: [job, stated], fitAssessments: [fit] });
  assert.ok(changed >= 2);
  assert.equal(job.salaryMin, null);
  assert.equal(job.currency, null);
  assert.equal(stated.salaryMin, 70000);
  assert.equal(stated.salaryMax, 85000);
  assert.equal(stated.currency, "GBP");
  assert.equal(fit.salaryNote, "No salary or day rate is stated.");
});

test("sign-in mail uses the sandbox sender unless another domain is set", () => {
  assert.equal(resendFrom(""), "onboarding@resend.dev");
  assert.equal(resendFrom("nigelsninja <onboarding@resend.dev>"), "onboarding@resend.dev");
  assert.equal(resendFrom("Nigel <jobs@nigeldown.com>"), "Nigel <jobs@nigeldown.com>");
});

test("a send is accepted only when Resend returns an id, and Nigel is not emailed", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.DIGEST_FROM;
  process.env.RESEND_API_KEY = "test-key";
  delete process.env.DIGEST_FROM;
  const original = globalThis.fetch;
  const calls: { to?: string; from?: string }[] = [];
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { to?: string[]; from?: string };
    calls.push({ to: body.to?.[0], from: body.from });
    return new Response(JSON.stringify({ id: "email_123" }), { status: 200 });
  }) as typeof fetch;
  try {
    const refused = await sendEmail("nigel@nigeldown.com", "Sign in to nigelsninja", "<p>link</p>");
    assert.equal(refused.sent, false);
    assert.equal(calls.length, 0);
    const accepted = await sendEmail("mail@michaeldown.co.uk", "Sign in to nigelsninja", "<p>link</p>");
    assert.equal(accepted.sent, true);
    assert.equal(accepted.id, "email_123");
    assert.equal(calls[0]?.to, "mail@michaeldown.co.uk");
    assert.equal(calls[0]?.from, "onboarding@resend.dev");
    globalThis.fetch = (async () => new Response(JSON.stringify({ message: "nope" }), { status: 403 })) as typeof fetch;
    const rejected = await sendEmail("mail@michaeldown.co.uk", "Sign in to nigelsninja", "<p>link</p>");
    assert.equal(rejected.sent, false);
    assert.equal(rejected.id, undefined);
  } finally {
    globalThis.fetch = original;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.DIGEST_FROM;
    else process.env.DIGEST_FROM = previousFrom;
  }
});

test("a used sign-in link leaves a 30-day httpOnly session cookie", () => {
  const env = process.env as { NODE_ENV?: string };
  const previous = env.NODE_ENV;
  env.NODE_ENV = "production";
  const cookie = sessionCookie("session-1");
  env.NODE_ENV = previous;
  assert.equal(cookie.name, "nja_session");
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, "lax");
  assert.equal(cookie.options.secure, true);
  assert.equal(cookie.options.maxAge, 60 * 60 * 24 * 30);
  env.NODE_ENV = "test";
  assert.equal(sessionCookie("session-1").options.secure, false);
  env.NODE_ENV = previous;
});
