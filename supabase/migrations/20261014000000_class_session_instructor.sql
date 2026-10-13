-- =============================================================================
-- Optional instructor per class session.
--
-- A course's lecture, lab and tutorial are often taught by different people,
-- so a timetable entry can name its own instructor. When empty, the app shows
-- the course's instructor instead.
-- =============================================================================

alter table public.class_sessions
  add column instructor text check (char_length(instructor) <= 100);
