/**
 * TypeScript shapes for rows in our database tables.
 *
 * These mirror the planned Supabase/PostgreSQL schema (see the spec, section 5).
 * Demo data in Stage 1 uses these exact shapes, so the same calculation code
 * works unchanged once real data arrives from Supabase in later stages.
 *
 * Conventions (same as what Supabase returns):
 *  - UUIDs are strings.
 *  - Timestamps (timestamptz) are ISO 8601 strings, e.g. "2026-10-13T09:00:00Z".
 *  - Dates are "YYYY-MM-DD" strings; times are "HH:MM:SS" strings.
 *  - Nullable columns are typed `T | null`.
 */

export type Uuid = string
export type IsoTimestamp = string
export type IsoDate = string
export type TimeOfDay = string

export const ASSIGNMENT_PRIORITIES = ['low', 'medium', 'high'] as const
export type AssignmentPriority = (typeof ASSIGNMENT_PRIORITIES)[number]

export const ASSIGNMENT_STATUSES = ['not_started', 'in_progress', 'completed'] as const
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

/** 1 = Monday ... 7 = Sunday (ISO 8601 weekday numbering). */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface Profile {
  id: Uuid
  display_name: string
  university_name: string | null
  timezone: string
  created_at: IsoTimestamp
  updated_at: IsoTimestamp
}

export interface Semester {
  id: Uuid
  user_id: Uuid
  name: string
  start_date: IsoDate
  end_date: IsoDate
  is_current: boolean
  created_at: IsoTimestamp
}

export interface Course {
  id: Uuid
  user_id: Uuid
  semester_id: Uuid
  course_code: string
  course_name: string
  instructor: string | null
  credits: number
  color: string
  created_at: IsoTimestamp
  updated_at: IsoTimestamp
}

export interface Assignment {
  id: Uuid
  user_id: Uuid
  course_id: Uuid
  title: string
  description: string | null
  due_at: IsoTimestamp | null
  priority: AssignmentPriority
  status: AssignmentStatus
  estimated_minutes: number | null
  created_at: IsoTimestamp
  updated_at: IsoTimestamp
}

export interface Exam {
  id: Uuid
  user_id: Uuid
  course_id: Uuid
  title: string
  exam_type: string | null
  starts_at: IsoTimestamp
  location: string | null
  notes: string | null
  created_at: IsoTimestamp
  updated_at: IsoTimestamp
}

export interface ClassSession {
  id: Uuid
  user_id: Uuid
  course_id: Uuid
  day_of_week: DayOfWeek
  start_time: TimeOfDay
  end_time: TimeOfDay
  location: string | null
  created_at: IsoTimestamp
  updated_at: IsoTimestamp
}

export interface GradeEntry {
  id: Uuid
  user_id: Uuid
  course_id: Uuid
  assessment_name: string
  score: number | null
  max_score: number | null
  weight_percent: number | null
  created_at: IsoTimestamp
  updated_at: IsoTimestamp
}

export interface CourseResult {
  id: Uuid
  user_id: Uuid
  course_id: Uuid
  final_grade_letter: string | null
  final_grade_points: number | null
  is_finalized: boolean
  updated_at: IsoTimestamp
}

export interface GradeScaleEntry {
  id: Uuid
  user_id: Uuid
  grade_letter: string
  grade_points: number
  created_at: IsoTimestamp
}

export interface StudySession {
  id: Uuid
  user_id: Uuid
  course_id: Uuid | null
  started_at: IsoTimestamp
  ended_at: IsoTimestamp | null
  duration_seconds: number | null
  notes: string | null
  created_at: IsoTimestamp
}
