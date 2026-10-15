-- =============================================================================
-- Make "one result per course" a per-user rule.
--
-- Before: unique (course_id). PostgreSQL checks uniqueness before foreign
-- keys, so a user inserting a result for SOMEONE ELSE's course got a
-- "duplicate key" error when that course already had a result, revealing
-- that it did. (They'd still be blocked; only that one fact leaked.)
--
-- After: unique (user_id, course_id). Each course still has at most one
-- result (a course has exactly one owner), and an attempt on another user's
-- course now fails on the ownership check without revealing anything.
-- =============================================================================

alter table public.course_results
  drop constraint course_results_one_per_course;

alter table public.course_results
  add constraint course_results_one_per_course unique (user_id, course_id);
