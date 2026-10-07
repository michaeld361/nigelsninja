# Nigel Job Search

A private LinkedIn job list for Nigel Down. He adds a role to his apply list, and the app drafts a cover letter, how to apply, a contact, and a short note on the company. He sends the application himself. The app never submits one.

## Run it locally

```bash
pnpm install
pnpm import:nigel   # first time: loads the CV, tracker and certificates, then runs the pipeline
pnpm dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). `pnpm dev` binds `0.0.0.0` on port 43123.

Sign in as `nigel@nigeldown.com` (candidate) or `mail@michaeldown.co.uk` (admin). Any other address is rejected and no session is created. With `RESEND_API_KEY` and `APP_URL` set, Continue emails a sign-in link on that public URL. The page says the email was sent only after Resend accepts it. If Resend rejects the send, the page shows the Resend error and the sign-in link.

## What you can do

- **Jobs.** LinkedIn roles from the last look. One action: Add to apply list.
- **Apply list.** Roles he wants to apply for. Each one shows a preparing state, then the letter, how to apply, the contact, and a company note. Copy the letter or download the .docx.
- **Profile.** CV, search words, radius, letter rules. Not part of the two-section nav.
- **Admin** (Michael only). Look on LinkedIn, run history, key health, spend. Reed and JSearch are not in this version's run.

Certificates (CIPP/E, CIPM, AIGP) are on the settings page as a download.

## Live sources and models

Without API keys the three sources return labelled **sample** listings, and scoring and letters use a local rubric and a local writer that follow the same rules as the model prompts. Nothing in a sample card should be treated as a live vacancy.

Set the variables in `env.example` to switch on the live path:

| Variable | Use |
| --- | --- |
| `APIFY_TOKEN`, `APIFY_LINKEDIN_ACTOR` | LinkedIn via a pinned Apify actor. No login. |
| `REED_API_KEY` | Reed.co.uk Jobseeker API. Cards say "via Reed.co.uk". |
| `RAPIDAPI_KEY` | JSearch on RapidAPI, the route to Indeed, Glassdoor and career sites. |
| `ANTHROPIC_API_KEY` | Scoring and fact-check with `SCORING_MODEL` (default `claude-sonnet-5-5`). Letters with `WRITING_MODEL` (default `claude-fable-5-1`). The letter stores whichever model actually wrote it. |
| `RESEND_API_KEY`, `DIGEST_TO`, `ALERT_TO` | 07:00-style digest and zero-result alerts. The scheduled command is `pnpm pipeline`. |

Anthropic's API does not use customer inputs to train models by default. Commercial retention for trust and safety is separate from training. Confirm the current retention terms in the Anthropic console before sending Nigel's CV, and use a zero-retention agreement if one is available on the account. Job descriptions and letters are not written to application logs.

Search keywords, the threshold, standing notes and the disclaimer live in Settings, not in the environment. The monthly ceiling defaults to $120. A run scores at most 80 roles and drafts at most 30 letters.

## Data

`pnpm import:nigel` reads `sources/` (the October 2026 CV, the tracker workbook, the PureGym sample letter and the certificate slides) into `data/seed.json` and `data/store.json`. The store is the local stand-in for the Supabase tables in `supabase/migrations/0001_init.sql`. Point the app at Supabase when you host it. The cron job on Render is `pnpm pipeline` at 06:00 Europe/London.

`pnpm test` covers title filters, London radius, dedupe, the solicitor cap, letter hard rules, and a second run that adds no duplicates.

## Letter rules

UK English. No em dashes or en dashes. 220 to 380 words. "CIPP/E, CIPM and AIGP". Mantle at most once. Never "current role". He is not a solicitor, and a letter says so when the spec requires or prefers one. Facts come only from the CV, the LinkedIn summary and the personal statement. Generated letters carry the line "This letter was drafted with AI assistance and reviewed and edited by me; all experience and achievements are my own." unless that letter's toggle is off.
