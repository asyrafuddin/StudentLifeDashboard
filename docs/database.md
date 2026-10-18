# Database schema

The database is PostgreSQL, hosted by Supabase. The schema is defined in
[`supabase/migrations/`](../supabase/migrations), the single source of truth.
This page explains it in plain language.

## Overview

```
auth.users (managed by Supabase Auth)
 └─ profiles               1 per user, created automatically on sign-up
 └─ grade_scale_entries    the user's letter → grade-point scale
 └─ semesters
     └─ courses
         ├─ assignments
         ├─ exams
         ├─ class_sessions    weekly timetable
         ├─ grade_entries     individual assessment scores
         ├─ course_results    final course grade (0 or 1 per course)
         └─ study_sessions    (course is optional)
 └─ assistant_requests     AI usage log for the daily limit (no direct access)
```

Every table except `profiles` has a `user_id` column. It defaults to the
signed-in user (`auth.uid()`), so the app never has to send it.

## Security model

Two independent layers make sure users only ever touch their own data:

1. **Row Level Security (RLS)** is enabled on every table. Policies allow a
   signed-in user to select, insert, update and delete only rows where
   `user_id = auth.uid()`. Signed-out (anonymous) requests get no table access.
2. **Ownership-checked relationships.** Child tables reference
   `(course_id, user_id)` → `courses(id, user_id)` rather than just `course_id`.
   Together with RLS (which forces `user_id` to be you), a row can only point at
   **your own** course. This matters because PostgreSQL's foreign-key checks
   don't apply RLS, so a plain `course_id` reference would let someone attach
   data to another user's course if they learned its ID. Courses reference
   semesters the same way.

Extra details:
- `profiles` can't be inserted or deleted by users (a trigger creates it and it
  is deleted with the account), and only `display_name`, `university_name` and
  `timezone` can be updated.
- The frontend only ever uses the public key. The service-role key, which
  bypasses RLS, is never used in the app.
- These rules are tested automatically in `supabase/tests/database.test.ts`.

## Tables

Common columns: `id` (UUID, auto-generated), `user_id` (owner), `created_at`,
and `updated_at` (kept current by a trigger on tables that have it).

### profiles
| Column | Type | Rules |
| --- | --- | --- |
| id | uuid | = the user's auth ID |
| display_name | text | ≤ 100 chars; from sign-up, or the email name |
| university_name | text, nullable | ≤ 200 chars |
| timezone | text | IANA name, e.g. `Asia/Kuala_Lumpur`; default `UTC` |

### semesters
| Column | Type | Rules |
| --- | --- | --- |
| name | text | 1–100 chars |
| start_date, end_date | date | end ≥ start |
| is_current | boolean | at most **one** current semester per user |

### courses
| Column | Type | Rules |
| --- | --- | --- |
| semester_id | uuid | must be your own semester |
| course_code | text | 1–20 chars, unique per semester |
| course_name | text | 1–150 chars |
| instructor | text, nullable | ≤ 100 chars |
| credits | numeric(4,1) | 0–99, never negative |
| color | text | hex color like `#6366f1` |

### assignments
| Column | Type | Rules |
| --- | --- | --- |
| course_id | uuid | must be your own course |
| title | text | 1–200 chars |
| description | text, nullable | ≤ 5000 chars |
| due_at | timestamptz, nullable | |
| priority | text | `low`, `medium`, `high` (default `medium`) |
| status | text | `not_started`, `in_progress`, `completed` |
| estimated_minutes | integer, nullable | > 0 |

### exams
| Column | Type | Rules |
| --- | --- | --- |
| course_id | uuid | must be your own course |
| title | text | 1–200 chars |
| exam_type | text, nullable | e.g. "Midterm", ≤ 50 chars |
| starts_at | timestamptz | required |
| location, notes | text, nullable | |

### class_sessions
| Column | Type | Rules |
| --- | --- | --- |
| course_id | uuid | must be your own course |
| day_of_week | smallint | 1 = Monday … 7 = Sunday |
| start_time, end_time | time | end > start |
| location | text, nullable | |
| instructor | text, nullable | ≤ 100 chars; overrides the course's instructor (e.g. a lab TA). Added in Stage 4. |

Overlapping sessions are **allowed**. The app highlights clashes instead of
rejecting them, since real timetables sometimes overlap.

### grade_entries
| Column | Type | Rules |
| --- | --- | --- |
| course_id | uuid | must be your own course |
| assessment_name | text | 1–150 chars |
| score | numeric, nullable | ≥ 0 (may exceed max_score, for bonus marks) |
| max_score | numeric, nullable | > 0 |
| weight_percent | numeric, nullable | 0–100 |

### course_results
| Column | Type | Rules |
| --- | --- | --- |
| course_id | uuid | **one result per course**: unique on (user_id, course_id), since Stage 5's migration |
| final_grade_letter | text, nullable | e.g. `A-`, or `Pass` for pass/fail courses |
| final_grade_points | numeric, nullable | 0–20 (supports scales other than 4.0) |
| is_finalized | boolean | only finalized results count toward GPA |

The app saves this with an *upsert* (insert, or update if the course already
has a result). A finalized result without grade points (e.g. "Pass") is kept
but left out of GPA, with the reason shown.

**Why the uniqueness rule includes `user_id`:** PostgreSQL checks unique
constraints before foreign keys. With `unique (course_id)` alone, trying to
add a result to *someone else's* course returned "duplicate key" whenever that
course already had one, revealing that fact. Including `user_id` means such an
attempt fails on the ownership check instead, revealing nothing. Each course
still has at most one result, because a course has exactly one owner.

### grade_scale_entries
| Column | Type | Rules |
| --- | --- | --- |
| grade_letter | text | 1–10 chars, **unique per user** |
| grade_points | numeric | 0–20 |

No scale is pre-filled, because universities differ. Users set theirs up in
**Settings → Grading scale**, optionally starting from a preset they then
edit. Final grades store their own copy of the grade points, so editing the
scale later doesn't silently change grades already recorded.

### study_sessions
| Column | Type | Rules |
| --- | --- | --- |
| course_id | uuid, nullable | optional link to your own course |
| started_at | timestamptz | required |
| ended_at | timestamptz, nullable | ≥ started_at; null while running |
| duration_seconds | integer, nullable | 0–86400 (24 h) |
| notes | text, nullable | ≤ 2000 chars |

A running timer is a row with `ended_at` = null, saved the moment it starts.
That's why a timer survives a page refresh. Stopping it fills in `ended_at`
and `duration_seconds`. A timer left running over 24 hours can't be saved
as-is (it exceeds the limit), so the app asks for the real duration instead.

### assistant_requests
| Column | Type | Rules |
| --- | --- | --- |
| user_id | uuid | the user who asked for AI suggestions |
| created_at | timestamptz | when they asked |

Used only for the AI assistant's daily limit (see [ai-assistant.md](ai-assistant.md)).
Users have **no** direct access to this table: no grants and no policies, so
they can't read it or reset their count. The Edge Function calls
`claim_assistant_request()`, a `security definer` function that only ever
touches the caller's own rows. It returns `false` once the caller has made
20 requests in the last 24 hours, and takes a per-user lock so two requests at
the same moment can't both slip under the limit.

## What happens when something is deleted

| Deleting… | Effect |
| --- | --- |
| a **user account** | all of their data is deleted |
| a **semester** | **blocked** while it still has courses (delete or move the courses first) |
| a **course** | its assignments, exams, class sessions, grade entries and course result are deleted; study sessions are **kept** but unlinked from the course |

The app will always explain these consequences and ask for confirmation
before deleting.

## Changing the schema later

Never edit a migration that has already been applied to a real database.
Instead, add a new file in `supabase/migrations/` named
`YYYYMMDDHHMMSS_short_description.sql`, apply it (see the migration list in
[supabase-setup.md](supabase-setup.md)), and update `src/types/database.ts`
to match. The Stage 4 file `20261014000000_class_session_instructor.sql` is
an example of this.

## Testing

```bash
npm test
```

This includes `supabase/tests/database.test.ts`, which runs every migration in
an in-memory PostgreSQL ([PGlite](https://pglite.dev)) with a small stand-in
for Supabase's `auth` schema, then checks the RLS policies, ownership rules,
constraints and delete behavior. No Docker or Supabase account is needed.
