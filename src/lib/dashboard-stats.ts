import {
  addDays,
  differenceInHours,
  format,
  getISODay,
  isSameDay,
  startOfWeek,
} from 'date-fns'
import type {
  Assignment,
  ClassSession,
  Course,
  CourseResult,
  Exam,
  Profile,
  Semester,
  StudySession,
} from '@/types/database'

/**
 * Pure functions that turn raw records into dashboard numbers.
 *
 * "Pure" means: no fetching, no React, no hidden clock. Every function that
 * depends on the current time receives `now` as a parameter, which makes the
 * results predictable and easy to unit-test.
 */

/** Everything the dashboard needs, loaded in one place. */
export interface DashboardData {
  profile: Profile
  semesters: Semester[]
  courses: Course[]
  assignments: Assignment[]
  exams: Exam[]
  classSessions: ClassSession[]
  courseResults: CourseResult[]
  studySessions: StudySession[]
}

/** The subset of records that belongs to one semester's courses. */
export interface SemesterScope {
  courses: Course[]
  assignments: Assignment[]
  exams: Exam[]
  classSessions: ClassSession[]
  courseResults: CourseResult[]
}

export function scopeToSemester(data: DashboardData, semesterId: string): SemesterScope {
  const courses = data.courses.filter((c) => c.semester_id === semesterId)
  const courseIds = new Set(courses.map((c) => c.id))
  const inScope = (row: { course_id: string }) => courseIds.has(row.course_id)
  return {
    courses,
    assignments: data.assignments.filter(inScope),
    exams: data.exams.filter(inScope),
    classSessions: data.classSessions.filter(inScope),
    courseResults: data.courseResults.filter(inScope),
  }
}

/** Picks the semester flagged as current, else the most recently started one. */
export function pickDefaultSemester(semesters: Semester[]): Semester | null {
  const current = semesters.find((s) => s.is_current)
  if (current) return current
  return [...semesters].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null
}

// ---------------------------------------------------------------------------
// Deadlines
// ---------------------------------------------------------------------------

/**
 * Sorts timestamps by actual time. Comparing the strings would break when they
 * use different UTC offsets ("…Z" vs "…+08:00").
 */
function byTime(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime()
}

/** How many hours ahead counts as "due soon". */
export const DUE_SOON_HOURS = 48

export type DeadlineState = 'completed' | 'overdue' | 'due_soon' | 'upcoming' | 'no_due_date'

export function getDeadlineState(assignment: Assignment, now: Date): DeadlineState {
  if (assignment.status === 'completed') return 'completed'
  if (!assignment.due_at) return 'no_due_date'
  const due = new Date(assignment.due_at)
  if (due < now) return 'overdue'
  if (differenceInHours(due, now) < DUE_SOON_HOURS) return 'due_soon'
  return 'upcoming'
}

/** Unfinished assignments with a due date, nearest first (overdue ones lead). */
export function getUpcomingDeadlines(
  assignments: Assignment[],
  limit = 5,
): Assignment[] {
  return assignments
    .filter((a) => a.status !== 'completed' && a.due_at !== null)
    .sort((a, b) => byTime(a.due_at!, b.due_at!))
    .slice(0, limit)
}

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------

export interface SummaryStats {
  courseCount: number
  pendingAssignments: number
  overdueAssignments: number
  upcomingExams: number
  completedAssignments: number
}

export function getSummaryStats(scope: SemesterScope, now: Date): SummaryStats {
  const pending = scope.assignments.filter((a) => a.status !== 'completed')
  return {
    courseCount: scope.courses.length,
    pendingAssignments: pending.length,
    overdueAssignments: pending.filter((a) => getDeadlineState(a, now) === 'overdue').length,
    upcomingExams: scope.exams.filter((e) => new Date(e.starts_at) >= now).length,
    completedAssignments: scope.assignments.length - pending.length,
  }
}

// ---------------------------------------------------------------------------
// Exams & classes
// ---------------------------------------------------------------------------

export function getUpcomingExams(exams: Exam[], now: Date, limit = 5): Exam[] {
  return exams
    .filter((e) => new Date(e.starts_at) >= now)
    .sort((a, b) => byTime(a.starts_at, b.starts_at))
    .slice(0, limit)
}

/** Class sessions that meet on `now`'s weekday, earliest first. */
export function getTodaysClasses(sessions: ClassSession[], now: Date): ClassSession[] {
  const today = getISODay(now) // 1 = Monday ... 7 = Sunday, same as our DB column
  return sessions
    .filter((s) => s.day_of_week === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

// ---------------------------------------------------------------------------
// Study time
// ---------------------------------------------------------------------------

export interface DailyStudyTotal {
  date: Date
  /** Short weekday label for chart axes, e.g. "Mon". */
  label: string
  minutes: number
}

/**
 * Study minutes for each day of `now`'s week (Monday to Sunday).
 * Only finished sessions count (they have a recorded duration). A session is
 * attributed to the day it started.
 */
export function getWeeklyStudyMinutes(
  sessions: StudySession[],
  now: Date,
): DailyStudyTotal[] {
  const monday = startOfWeek(now, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  return days.map((date) => {
    const seconds = sessions
      .filter((s) => s.duration_seconds !== null && isSameDay(new Date(s.started_at), date))
      .reduce((sum, s) => sum + s.duration_seconds!, 0)
    return { date, label: format(date, 'EEE'), minutes: Math.round(seconds / 60) }
  })
}

// ---------------------------------------------------------------------------
// Course progress
// ---------------------------------------------------------------------------

export interface CourseProgress {
  course: Course
  total: number
  completed: number
  /** null when the course has no assignments yet (avoid a fake 0%). */
  percent: number | null
}

export function getCourseProgress(
  courses: Course[],
  assignments: Assignment[],
): CourseProgress[] {
  return courses.map((course) => {
    const own = assignments.filter((a) => a.course_id === course.id)
    const completed = own.filter((a) => a.status === 'completed').length
    return {
      course,
      total: own.length,
      completed,
      percent: own.length > 0 ? Math.round((completed / own.length) * 100) : null,
    }
  })
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function getGreeting(now: Date): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
