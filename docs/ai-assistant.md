# AI study assistant (optional)

The **Study Assistant** page suggests what to work on over the next week.

- **Without any setup** it shows a **rule-based plan**: overdue work first,
  then what's due within two days, exam revision, the rest of the week, and
  courses you haven't studied this week. It works in demo mode too.
- **With the setup below**, a **Get AI suggestions** button asks Google's
  **Gemini** (free tier, no credit card needed) for a more personal plan from
  the same information.

Both are clearly labelled as suggestions. Neither one changes your data.

## How it works

```
Browser (Study Assistant page)
  │  your sign-in token + a small summary of upcoming work
  ▼
Supabase Edge Function "study-assistant"   ← holds the AI key (a server-side secret)
  │  1. checks you're signed in
  │  2. checks the summary has exactly the expected shape and size
  │  3. checks your daily limit (20 requests per 24 hours)
  ▼
Google Gemini API (free tier) → plan → tidied and checked again → back to the browser
```

- The AI key exists **only** as a Supabase secret. It's never in the browser,
  in `.env.local`, or in git.
- The function can't change your data: it reads nothing from your tables and
  only returns suggestions. Its only database call is the usage-limit check.
- If anything fails (not set up, offline, limit reached, AI down), the page
  explains why and keeps showing the rule-based plan.

Code: `supabase/functions/study-assistant/` (server) and
`supabase/functions/_shared/study-assistant-contract.ts` (the exact request
and plan formats, shared by the browser and the server).

## What is sent to the AI, and what isn't

Only when you click **Get AI suggestions**, and only for your current semester:

| Sent | Never sent |
| --- | --- |
| Course codes, names and credits | Your name, email or account id |
| Unfinished assignments due within 14 days (or overdue up to 30 days): course code, title, due date/time, priority, status, time estimate | Assignment descriptions, exam locations and notes |
| Exams in the next 30 days: course code, title, type, date/time | Grades and GPA |
| This week's study minutes per course code | Study-session notes, timetable, instructors |

The page has a **What the AI would see → Show the exact data** section that
displays exactly what would be sent.

> **Free tier and privacy:** on Gemini's free tier, Google may use what you
> send to improve its products, and people at Google may review it. That's
> why only the minimal summary above is sent. Don't type anything private
> into assignment or exam titles if you use AI suggestions. (Google's paid
> tier doesn't use your data this way, but this app is set up for free use.)

## Set up (about 15 minutes)

You need Supabase already connected ([supabase-setup.md](supabase-setup.md))
and a Google account. Nothing here costs money.

### 1. Run the usage-limit migration

In the Supabase **SQL Editor**, run
`supabase/migrations/20261018000000_study_assistant_usage.sql`, the same way as
the earlier migrations. It adds the daily limit, so no one can run up your AI bill.

### 2. Get a free Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com) and sign in with
   your Google account.
2. Click **Get API key** → **Create API key**. It usually starts with `AIza`.
3. Copy it for the next step.

**Don't add billing to this Google Cloud project.** Without billing it stays
on the free tier: when the free quota runs out, requests are simply refused
until it resets (the app then shows the rule-based plan). You can never be
charged.

The free tier allows only a few requests per minute and a limited number per
day for the whole app. That's plenty for personal use. Check your current
limits on AI Studio's usage page.

### 3. Store the key as a Supabase secret

In the Supabase dashboard: **Edge Functions → Secrets** → add a secret.

- Name: `GEMINI_API_KEY`
- Value: your key

> Don't put this key in `.env.local` or in any `VITE_` variable. Anything in
> those ends up in the browser, where anyone can read it.

Optional: add `GEMINI_MODEL` to choose a model. The default,
`gemini-flash-latest`, always points to Google's current free Flash model, so
it keeps working when Google releases new versions. A "Flash-Lite" model
(see the model list in AI Studio) usually allows more requests per minute.

### 4. Deploy the function

Run these in the project folder (VS Code terminal):

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy study-assistant
```

- `login` opens your browser to sign in to Supabase.
- `link` connects this folder to your project. `YOUR_PROJECT_REF` is the ID
  in your dashboard URL: `https://supabase.com/dashboard/project/<this-part>`.
  If it asks for the database password and you don't have it, you can reset
  it under **Project Settings → Database**.
- If `deploy` says Docker isn't running, use
  `npx supabase functions deploy study-assistant --use-api`.

> **Don't run `npx supabase db push`.** Your migrations were applied in the
> SQL Editor, and the CLI would try to apply them all again.

### 5. Try it

Open **Study Assistant** in the app and click **Get AI suggestions**. The plan
should now carry the **AI-generated suggestions** label.

## Troubleshooting

The app shows a message under "No AI suggestions this time":

| Message | Fix |
| --- | --- |
| The assistant function isn't deployed to Supabase yet. | Do step 4. |
| AI suggestions are not set up for this app yet. | The `GEMINI_API_KEY` secret is missing. Do step 3 (no redeploy needed). |
| The assistant's database setup is incomplete. | Run the migration from step 1. |
| Your session has expired. Please sign in again. (even right after signing in) | Your project may use Supabase's newer JWT signing keys. Redeploy with `--no-verify-jwt`; the function still checks sign-in itself. |
| The free AI quota is used up for the moment. | Gemini's free per-minute or daily limit was reached. Wait a minute (daily limits reset at midnight US Pacific time). |
| The AI service is unavailable right now. | Open **Edge Functions → study-assistant → Logs** in Supabase. Common causes: a wrong key (400/403), or a model name in `GEMINI_MODEL` that doesn't exist (404). |
| You've reached today's limit for AI suggestions. | The limit is 20 requests per 24 hours per user. |
| Couldn't reach the assistant. | Check your internet connection. |

Changing the daily limit: add a new migration that recreates
`public.claim_assistant_request()` with a different number. Don't edit the
migration you already ran.

## Costs

None, as long as billing isn't enabled on the Google project that owns the
key. Supabase Edge Functions are also included in Supabase's free plan.

## Tests

Automated (`npm test`):

| File | Checks |
| --- | --- |
| `supabase/tests/study-assistant-function.test.ts` | Sign-in required; malformed, oversized or extra-field requests rejected before the AI is called; "not configured"; daily limit; free-quota errors; Gemini's reply format (thinking parts skipped, over-long text trimmed, unusable answers rejected); the key never appears in the URL, responses or logs |
| `supabase/tests/database.test.ts` | The daily limit: 20 per user per 24 hours, users counted separately, no direct access to the usage table, no access for signed-out visitors |
| `src/lib/assistant.test.ts` | What's included in the summary (and what's left out); the rule-based plan; everything the app builds fits the shared contract |
| `src/services/assistant.test.ts`, `src/pages/AssistantPage.test.tsx` | Each failure gets a clear message; the page labels the plan's source and falls back to the rule-based plan |

The function's Deno wiring (`index.ts`) was type-checked with `deno check`
and run locally against a fake Supabase, but not against your real project.
Do steps 1–5 and the check in step 5 to confirm it works there.
