# Testing

## Running the tests

```bash
npm test                # run everything once (about a minute)
npm run test:watch      # re-run affected tests whenever you save a file
npm run test:coverage   # also measure which code the tests run
```

`test:coverage` prints a summary and writes a browsable report to
`coverage/index.html` (open it in your browser; it's git-ignored).

To run one file or one test by name:

```bash
npx vitest run src/lib/gpa.test.ts                                       # one file
npx vitest run src/lib/gpa.test.ts -t "weights grade points by credits"  # one test in that file
```

`-t` picks tests by name. It works without a file too, but then Vitest opens
every test file to look for matching names and reports all the others as
**skipped**. That's expected, not a problem; naming the file just makes it faster.

No Supabase account, Docker or internet connection is needed: the database
tests use an in-memory PostgreSQL, and page tests replace the database with
in-memory fakes.

## What the automated tests cover

| Area | Files | Examples of what's checked |
| --- | --- | --- |
| **Calculations** | `src/lib/*.test.ts` | GPA weighted by credits, with excluded courses and reasons; "Insufficient data" instead of 0.00; weighted course results (not simple averages); dashboard counts; deadline states; study totals; timetable clash layout; exam countdowns |
| **Validation** | `src/lib/schemas*.test.ts` | Every form's rules: required fields, number formats and ranges, dates and times, end-after-start, text limits |
| **Page workflows** | `src/pages/*.test.tsx`, `src/components/**/*.test.tsx` | Clicking through real pages in a simulated browser: create, edit, complete, delete; validation messages; delete safeguards; failed saves keep the form open; empty states; load errors with retry |
| **Navigation & security in the app** | `src/router.test.tsx` | Signed-out visitors can't reach any private page; signed-in users skip the login page; demo mode is labelled; the crash screen |
| **Data loading** | `src/hooks/useAsync.test.tsx`, `src/lib/fetch-all.test.ts` | Refresh keeps data on screen; failed refresh keeps data; refresh on returning to the tab; paging past Supabase's 1,000-row limit |
| **Database security** | `supabase/tests/database.test.ts` | The real migrations in PostgreSQL: users can't see, change, delete or link to other users' data (RLS + ownership checks); constraints; what deleting a course or semester does |
| **Forms vs. database** | `supabase/tests/schema-parity.test.ts` | The longest text and largest numbers each form accepts are also accepted by the database |

**Tests that were checked to work:** several of these were verified by
deliberately breaking the code they protect (for example turning off RLS,
switching GPA to a simple average, or letting a form accept longer text than
the database) and confirming the tests failed.

## What still needs a manual check

The automated tests can't talk to your real Supabase project. After setting
it up (see [supabase-setup.md](supabase-setup.md)) and after running new
migrations, check these once by hand.

### 1. Two accounts can't see each other's data (5 minutes)

1. Sign up as **user A**. Add a semester, a course and an assignment.
2. Sign out. Sign up as **user B** (a different email).
3. As user B, check **My Courses**, **Assignments** and the **Dashboard**:
   none of user A's data should appear anywhere.
4. Optional, for the curious: in your browser's developer tools (F12 →
   Console) while signed in as B, run:

   ```js
   // Uses the app's own connection. RLS should return an empty list.
   const { data } = await (await import('/src/lib/supabase.ts')).supabase.from('courses').select('*'); data
   ```

   It should only list user B's courses (an empty list if B has none).

### 2. Core workflows on the real database (10 minutes)

- [ ] Sign up, confirm email (if enabled), sign in, sign out; after signing
      out, visiting `/settings` sends you to the sign-in page
- [ ] Change your name in Settings and refresh: the change is still there
- [ ] Add a semester and a course; refresh: both are still there
- [ ] Add an assignment, tick it complete, refresh: still completed
- [ ] Delete a course that has an assignment: the dialog lists the assignment
      and asks you to type the course code
- [ ] Add an exam and a timetable class; both appear on the dashboard when due
- [ ] Set up a grading scale, enter a finalized final grade: GPA appears
- [ ] Start the study timer, refresh the page (it keeps running), stop it:
      the session appears in the totals
- [ ] Turn off Wi-Fi: the offline banner appears, and saving shows a clear error

### 3. Looks right on your devices

Open the app on a phone (or a narrow browser window) and check that every page
fits the screen without sideways scrolling.

If anything fails, note the steps and the exact message shown.
