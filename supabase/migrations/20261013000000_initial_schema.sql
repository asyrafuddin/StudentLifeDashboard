-- =============================================================================
-- Student Life Dashboard: initial schema
--
-- Creates all tables, constraints, indexes, triggers and Row Level Security
-- (RLS) policies. See docs/database.md for a plain-language walkthrough.
--
-- How ownership is enforced (two layers):
--   1. RLS policies: a signed-in user can only see/insert/update/delete rows
--      whose user_id equals their own auth.uid().
--   2. Composite foreign keys: child rows reference (course_id, user_id), not
--      just course_id. A row can therefore only point at a course owned by the
--      SAME user. This matters because foreign-key checks ignore RLS — without
--      this, someone who guessed another user's course id could attach to it.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Helper: keep updated_at current on every UPDATE
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- profiles: one row per user, created automatically on sign-up
-- -----------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text not null default ''
                  check (char_length(display_name) <= 100),
  university_name text check (char_length(university_name) <= 200),
  timezone        text not null default 'UTC'
                  check (char_length(timezone) between 1 and 64),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Runs with the table owner's rights (security definer) because the new user
-- is not signed in yet when auth.users gets the row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                  split_part(new.email, '@', 1),
                  ''), 100),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- semesters
-- -----------------------------------------------------------------------------
create table public.semesters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 100),
  start_date  date not null,
  end_date    date not null,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now(),

  constraint semesters_dates_valid check (end_date >= start_date),
  -- Target for composite foreign keys (see header comment).
  constraint semesters_id_user_unique unique (id, user_id)
);

create index semesters_user_id_idx on public.semesters (user_id);
-- At most one "current" semester per user.
create unique index semesters_one_current_per_user
  on public.semesters (user_id) where is_current;


-- -----------------------------------------------------------------------------
-- courses
-- -----------------------------------------------------------------------------
create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  semester_id  uuid not null,
  course_code  text not null check (char_length(trim(course_code)) between 1 and 20),
  course_name  text not null check (char_length(trim(course_name)) between 1 and 150),
  instructor   text check (char_length(instructor) <= 100),
  credits      numeric(4, 1) not null default 0 check (credits >= 0 and credits <= 99),
  color        text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint courses_id_user_unique unique (id, user_id),
  constraint courses_code_unique_per_semester unique (user_id, semester_id, course_code),
  -- RESTRICT: a semester that still has courses cannot be deleted by accident.
  constraint courses_semester_fk foreign key (semester_id, user_id)
    references public.semesters (id, user_id) on delete restrict
);

create index courses_semester_id_idx on public.courses (semester_id);
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- assignments
-- -----------------------------------------------------------------------------
create table public.assignments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id          uuid not null,
  title              text not null check (char_length(trim(title)) between 1 and 200),
  description        text check (char_length(description) <= 5000),
  due_at             timestamptz,
  priority           text not null default 'medium'
                     check (priority in ('low', 'medium', 'high')),
  status             text not null default 'not_started'
                     check (status in ('not_started', 'in_progress', 'completed')),
  estimated_minutes  integer check (estimated_minutes > 0 and estimated_minutes <= 100000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- CASCADE: deleting a course deletes its assignments (the app warns first).
  constraint assignments_course_fk foreign key (course_id, user_id)
    references public.courses (id, user_id) on delete cascade
);

create index assignments_course_id_idx on public.assignments (course_id);
create index assignments_user_due_idx on public.assignments (user_id, due_at);
create trigger assignments_set_updated_at
  before update on public.assignments
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- exams
-- -----------------------------------------------------------------------------
create table public.exams (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id   uuid not null,
  title       text not null check (char_length(trim(title)) between 1 and 200),
  exam_type   text check (char_length(exam_type) <= 50),
  starts_at   timestamptz not null,
  location    text check (char_length(location) <= 200),
  notes       text check (char_length(notes) <= 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint exams_course_fk foreign key (course_id, user_id)
    references public.courses (id, user_id) on delete cascade
);

create index exams_course_id_idx on public.exams (course_id);
create index exams_user_starts_idx on public.exams (user_id, starts_at);
create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- class_sessions (weekly timetable)
-- Overlapping sessions are deliberately allowed; the app flags them instead.
-- -----------------------------------------------------------------------------
create table public.class_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id    uuid not null,
  day_of_week  smallint not null check (day_of_week between 1 and 7), -- 1 = Monday
  start_time   time not null,
  end_time     time not null,
  location     text check (char_length(location) <= 200),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint class_sessions_times_valid check (end_time > start_time),
  constraint class_sessions_course_fk foreign key (course_id, user_id)
    references public.courses (id, user_id) on delete cascade
);

create index class_sessions_course_id_idx on public.class_sessions (course_id);
create index class_sessions_user_day_idx on public.class_sessions (user_id, day_of_week);
create trigger class_sessions_set_updated_at
  before update on public.class_sessions
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- grade_entries (individual assessment results)
-- score may exceed max_score to allow bonus marks.
-- -----------------------------------------------------------------------------
create table public.grade_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id        uuid not null,
  assessment_name  text not null check (char_length(trim(assessment_name)) between 1 and 150),
  score            numeric(8, 2) check (score >= 0),
  max_score        numeric(8, 2) check (max_score > 0),
  weight_percent   numeric(5, 2) check (weight_percent >= 0 and weight_percent <= 100),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint grade_entries_course_fk foreign key (course_id, user_id)
    references public.courses (id, user_id) on delete cascade
);

create index grade_entries_course_id_idx on public.grade_entries (course_id);
create trigger grade_entries_set_updated_at
  before update on public.grade_entries
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- course_results (final course grade, entered or confirmed by the student)
-- -----------------------------------------------------------------------------
create table public.course_results (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id           uuid not null,
  final_grade_letter  text check (char_length(final_grade_letter) between 1 and 10),
  final_grade_points  numeric(4, 2) check (final_grade_points >= 0 and final_grade_points <= 20),
  is_finalized        boolean not null default false,
  updated_at          timestamptz not null default now(),

  constraint course_results_one_per_course unique (course_id),
  constraint course_results_course_fk foreign key (course_id, user_id)
    references public.courses (id, user_id) on delete cascade
);

create index course_results_user_id_idx on public.course_results (user_id);
create trigger course_results_set_updated_at
  before update on public.course_results
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- grade_scale_entries (the user's configurable letter -> points scale)
-- -----------------------------------------------------------------------------
create table public.grade_scale_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  grade_letter  text not null check (char_length(trim(grade_letter)) between 1 and 10),
  grade_points  numeric(4, 2) not null check (grade_points >= 0 and grade_points <= 20),
  created_at    timestamptz not null default now(),

  constraint grade_scale_letter_unique_per_user unique (user_id, grade_letter)
);


-- -----------------------------------------------------------------------------
-- study_sessions
-- course_id is optional; deleting a course keeps the session but unlinks it.
-- -----------------------------------------------------------------------------
create table public.study_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id         uuid,
  started_at        timestamptz not null,
  ended_at          timestamptz,
  duration_seconds  integer check (duration_seconds >= 0 and duration_seconds <= 86400),
  notes             text check (char_length(notes) <= 2000),
  created_at        timestamptz not null default now(),

  constraint study_sessions_times_valid check (ended_at is null or ended_at >= started_at),
  -- SET NULL (course_id) clears only course_id, keeping user_id intact (PostgreSQL 15+).
  constraint study_sessions_course_fk foreign key (course_id, user_id)
    references public.courses (id, user_id) on delete set null (course_id)
);

create index study_sessions_user_started_idx on public.study_sessions (user_id, started_at);
create index study_sessions_course_id_idx on public.study_sessions (course_id);


-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Start from zero privileges, then grant only what the app needs.
-- Anonymous (signed-out) visitors get no table access at all.
revoke all on
  public.profiles, public.semesters, public.courses, public.assignments,
  public.exams, public.class_sessions, public.grade_entries,
  public.course_results, public.grade_scale_entries, public.study_sessions
from anon, authenticated;

-- Profiles: users may read theirs and edit only these three columns.
grant select on public.profiles to authenticated;
grant update (display_name, university_name, timezone) on public.profiles to authenticated;
grant select, insert, update, delete on
  public.semesters, public.courses, public.assignments, public.exams,
  public.class_sessions, public.grade_entries, public.course_results,
  public.grade_scale_entries, public.study_sessions
to authenticated;

alter table public.profiles            enable row level security;
alter table public.semesters           enable row level security;
alter table public.courses             enable row level security;
alter table public.assignments         enable row level security;
alter table public.exams               enable row level security;
alter table public.class_sessions      enable row level security;
alter table public.grade_entries       enable row level security;
alter table public.course_results      enable row level security;
alter table public.grade_scale_entries enable row level security;
alter table public.study_sessions      enable row level security;

-- profiles: read and update your own row. (Rows are created by the sign-up
-- trigger and deleted with the account, so no insert/delete policies.)
create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Every other table gets the same four "own rows only" policies.
-- `(select auth.uid())` is evaluated once per query instead of once per row.
do $$
declare
  t text;
begin
  foreach t in array array[
    'semesters', 'courses', 'assignments', 'exams', 'class_sessions',
    'grade_entries', 'course_results', 'grade_scale_entries', 'study_sessions'
  ]
  loop
    execute format(
      'create policy "Users can view their own rows" on public.%I
         for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Users can insert their own rows" on public.%I
         for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Users can update their own rows" on public.%I
         for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Users can delete their own rows" on public.%I
         for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;
