import type { Course } from '@/types/database'

/** How many records are linked to a course (used before deleting it). */
export interface CourseRelatedCounts {
  assignments: number
  exams: number
  classSessions: number
  gradeEntries: number
  courseResults: number
  studySessions: number
}

export interface CourseDeletionImpact {
  /** Human-readable lines, e.g. "3 assignments", for records that will be deleted. */
  deleted: string[]
  /** Records that survive but lose their link to the course. */
  unlinked: string[]
  hasRelatedRecords: boolean
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Explains what deleting a course will do, matching the database rules:
 * most related records are deleted with it (ON DELETE CASCADE), but study
 * sessions are kept and unlinked (ON DELETE SET NULL).
 */
export function describeCourseDeletion(counts: CourseRelatedCounts): CourseDeletionImpact {
  const deleted = [
    counts.assignments && plural(counts.assignments, 'assignment', 'assignments'),
    counts.exams && plural(counts.exams, 'exam', 'exams'),
    counts.classSessions && plural(counts.classSessions, 'timetable class', 'timetable classes'),
    counts.gradeEntries && plural(counts.gradeEntries, 'grade entry', 'grade entries'),
    counts.courseResults && 'the final course grade',
  ].filter((line): line is string => Boolean(line))

  const unlinked = counts.studySessions
    ? [plural(counts.studySessions, 'study session', 'study sessions')]
    : []

  return { deleted, unlinked, hasRelatedRecords: deleted.length + unlinked.length > 0 }
}

/** Case-insensitive search across code, name and instructor. */
export function searchCourses(courses: Course[], query: string): Course[] {
  const q = query.trim().toLowerCase()
  if (!q) return courses
  return courses.filter((c) =>
    [c.course_code, c.course_name, c.instructor ?? ''].some((field) => field.toLowerCase().includes(q)),
  )
}
