# Deploying the app (step by step)

The app has two parts:

| Part | Where it runs | Cost |
| --- | --- | --- |
| The website (React app, built into static files) | **Vercel** (recommended) or Netlify | Free plan |
| Database, sign-in, and the optional AI function | **Supabase** (already set up) | Free plan |

Deploying means putting the website online and telling Supabase its new address.
It takes about 15 minutes.

## Before you start

- [ ] Supabase is set up and the app works locally with your account
      ([supabase-setup.md](supabase-setup.md)), with **all** migrations run.
- [ ] `npm test` and `npm run build` both succeed.
- [ ] Your latest code is pushed to GitHub (`git status` shows nothing to commit).

## 1. Put the website on Vercel

1. Go to [vercel.com](https://vercel.com) and **sign up with GitHub**.
2. Click **Add New… → Project**, find `StudentLifeDashboard`, and click **Import**.
3. Vercel detects **Vite** automatically. Leave the build command
   (`npm run build`) and output folder (`dist`) as they are.
4. Open **Environment Variables** and add the same two values as in your
   `.env.local`:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | your **public** key (publishable / anon) |

   These two are public by design (they end up in the browser anyway; Row
   Level Security protects the data). **Never** add the Supabase secret /
   service-role key or the Gemini key here.
5. Click **Deploy**. After a minute you get an address like
   `https://student-life-dashboard.vercel.app`.

From now on, every `git push` to `main` updates the live site automatically.

`vercel.json` in the project makes page addresses like `/assignments` work
when opened directly or refreshed, and adds basic security headers.

## 2. Tell Supabase the new address

Sign-up confirmation and password-reset emails contain links back to the app.
Supabase only allows links to addresses you list.

1. In Supabase, open **Authentication → URL Configuration**.
2. Set **Site URL** to your Vercel address, e.g. `https://student-life-dashboard.vercel.app`.
3. Under **Redirect URLs**, add `https://student-life-dashboard.vercel.app/**`.
   Keep `http://localhost:5173/**` too, so local development still works.
4. Save.

## 3. Get sign-up emails ready for real users

- **Turn email confirmation on** if you turned it off for testing:
  **Authentication → Sign In / Providers → Email → Confirm email**.
- Supabase's built-in email service only sends **a few emails per hour** and
  is meant for testing. If other people will use the app, set up your own
  email sender under **Authentication → Emails → SMTP Settings**. Several
  email services have free plans (search "transactional email free tier").

## 4. Check the live site

Open your Vercel address and check:

- [ ] You see the **Sign in** page. (If you see the yellow **demo mode**
      banner, the environment variables are missing; see Troubleshooting.)
- [ ] Sign up with a new email; the confirmation link opens **the live site**,
      not localhost.
- [ ] Sign in, add a course, then refresh the page on `/courses`: it still works.
- [ ] **Forgot password?** on the sign-in page sends an email whose link lets
      you choose a new password.
- [ ] On a phone, the app fits the screen and the menu (☰) works.
- [ ] Optional: in the browser's developer tools (F12 → Sources), search the
      app's files for `service_role` and `AIza`. Nothing should be found.

Then run the two-account check from [testing.md](testing.md) on the live site.

## The AI assistant (optional)

Nothing extra to do: the `study-assistant` function runs on Supabase, not
Vercel, and accepts requests from any address as long as the user is signed
in. If you haven't set it up yet, see [ai-assistant.md](ai-assistant.md).

## Good to know

- **Free Supabase projects pause after about a week without activity.** If
  the live app suddenly can't sign anyone in, open your Supabase dashboard
  and click **Restore project**.
- **Environment variables are read when the site is built.** After changing
  them in Vercel, redeploy: **Deployments → ⋯ → Redeploy**.
- **Preview deployments:** pushing a branch other than `main` creates a
  preview with its own address. Sign-in emails won't link there unless you
  add that address to Supabase's Redirect URLs (signing in with a password
  works anyway).
- **After an update**, people with the app already open may see "A new
  version of the app is available"; reloading fixes it.

## Netlify instead of Vercel

`netlify.toml` already has the right settings. In Netlify: **Add new site →
Import an existing project → GitHub →** choose the repository, add the same
two environment variables under **Site configuration → Environment
variables**, and deploy. Then do steps 2–4 above with your Netlify address.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| The live site shows the **demo mode** banner | The `VITE_` environment variables are missing or misspelled. Add them in Vercel, then redeploy. |
| **404** when refreshing a page like `/assignments` | `vercel.json` (or `netlify.toml`) wasn't deployed. Check it's in GitHub at the project root. |
| Email links open `localhost` | Step 2: set **Site URL** to the live address. |
| "Redirect URL not allowed" or the reset link goes to the home page | Step 2: add `https://your-address/**` to **Redirect URLs**. |
| Nobody receives emails | The built-in sender's hourly limit was reached. Wait, or set up SMTP (step 3). |
| Build fails on Vercel | Run `npm run build` locally and fix the error it shows, then push again. |
