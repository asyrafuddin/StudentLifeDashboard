# Connecting Supabase (step by step)

Without Supabase the app runs in **demo mode** with sample data. These steps
connect it to a real database so you can sign up and your data is saved.
It takes about 10 minutes and is free.

> Supabase occasionally renames menu items. If a label below doesn't match
> exactly, look for the closest equivalent; the steps are the same.

## 1. Create a Supabase project

1. Go to <https://supabase.com> and sign in (GitHub sign-in works).
2. Click **New project**.
3. Fill in:
   - **Name:** `student-life-dashboard`
   - **Database password:** click *Generate* and **save it in a password manager**.
     You only need it for the optional CLI method in step 2.
   - **Region:** the one closest to you.
4. Click **Create new project** and wait 1–2 minutes until it's ready.

## 2. Create the database tables (run the migration)

**Option A: SQL Editor (easiest)**

1. In your project, open **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `supabase/migrations/20261013000000_initial_schema.sql` from this
   project in VS Code, select everything (Ctrl+A), copy it, and paste it into
   the editor.
4. Click **Run**. You should see *"Success. No rows returned"*.
5. Open **Table Editor**: you should see 10 tables (`profiles`, `semesters`,
   `courses`, …), each marked as RLS enabled.

Run the file **only once**. Running it again fails with "already exists"
errors (harmless, but nothing new happens).

**Option B: Supabase CLI** (useful later, when there are several migrations)

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF   # asks for the database password
npx supabase db push                               # applies everything in supabase/migrations
```

`YOUR_PROJECT_REF` is the random ID in your project's URL:
`https://supabase.com/dashboard/project/<this-part>`.

## 3. Copy your project URL and public key

1. Click **Connect** at the top of the project dashboard, or open
   **Project Settings → API Keys** (the URL is under **Data API**).
2. Copy the **Project URL**, which looks like `https://abcdefgh.supabase.co`.
3. Copy the **public** key. Depending on your project this is called the
   **Publishable key** (starts with `sb_publishable_`) or the **anon public**
   key (a long `eyJ…` string). Either works.

⚠️ **Never** copy the **secret** / **service_role** key into this app. It
bypasses all security rules and must never be in browser code.

## 4. Add the keys to the app

1. In VS Code, in the project root, copy `.env.example` and name the copy
   **`.env.local`**.
2. Fill in your values:

   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxx
   ```

3. **Restart** the dev server (Ctrl+C in the terminal, then `npm run dev`).
   Vite only reads `.env.local` at startup.

`.env.local` is listed in `.gitignore`, so it will never be uploaded to GitHub.

## 5. Configure sign-in redirects

1. Open **Authentication → URL Configuration**.
2. Set **Site URL** to `http://localhost:5173`.
3. Under **Redirect URLs**, add `http://localhost:5173/**`.
4. Save.

This is where the "confirm your email" link sends people. When you deploy
(Stage 8) you'll add your live URL here too.

### Email confirmation (optional for local testing)

By default, new accounts must click a confirmation link in their email.
Supabase's built-in email service only sends a few emails per hour, which can
slow down testing. While developing you can turn confirmation off:
**Authentication → Sign In / Providers → Email → turn off "Confirm email"**.
Turn it back on before real users sign up.

## 6. Check that it works

1. Open <http://localhost:5173>. You should see the **Sign in** page, not
   the dashboard. (No more yellow demo banner.)
2. Click **Create an account** and sign up.
3. Confirm your email if required, then sign in.
4. The dashboard should greet you by name and show the "Let's set up your
   semester" empty state (there's no data yet; courses arrive in Stage 3).
5. Go to **Settings**, change your name or timezone, click **Save changes**,
   then refresh the page. The change should still be there.
6. In Supabase, open **Table Editor → profiles**. Your row is there.
7. Click **Sign out** (bottom of the sidebar). You should land on the sign-in
   page, and visiting <http://localhost:5173/settings> should send you back to it.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Still seeing demo mode | `.env.local` must be in the project root (next to `package.json`), the variable names must match exactly, and you must restart `npm run dev`. |
| "Incorrect email or password" right after signing up | Confirm your email first (check spam), or turn off "Confirm email" (see above). |
| "Your profile was not found" in Settings | The migration didn't run, or you signed up before running it. Run the migration, then sign up with a new account (or delete the user under **Authentication → Users** and sign up again). |
| "Too many attempts" when signing up | The built-in email limit was hit. Wait an hour, or turn off "Confirm email" while testing. |
| Confirmation link opens a broken page | Check the Site URL and Redirect URLs in step 5. |
| `relation "public.profiles" already exists` | The migration already ran. Nothing to do. |
