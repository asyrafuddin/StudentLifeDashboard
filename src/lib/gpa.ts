import type { Course, CourseResult } from '@/types/database'

/**
 * GPA = sum(grade points × credits) / sum(credits)
 *
 * Only courses with a FINALIZED result that has grade points and positive
 * credits are included. Everything else is excluded *with a reason*, so the
 * UI can explain why a course didn't count instead of silently ignoring it.
 * If no course qualifies, `gpa` is null and the UI shows "Insufficient data".
 */

export type GpaExclusionReason =
  | 'no_result' // no course_results row yet
  | 'not_finalized' // result exists but the student hasn't marked it final
  | 'missing_grade_points' // finalized, but no grade-point value recorded
  | 'no_credits' // credits are 0, so the course carries no GPA weight

export const GPA_EXCLUSION_LABELS: Record<GpaExclusionReason, string> = {
  no_result: 'No final grade recorded',
  not_finalized: 'Grade not finalized',
  missing_grade_points: 'Grade points missing',
  no_credits: 'Course has 0 credits',
}

export interface GpaCourseLine {
  course: Course
  gradePoints: number
  gradeLetter: string | null
}

export interface GpaExclusion {
  course: Course
  reason: GpaExclusionReason
}

export interface GpaResult {
  /** null means "Insufficient data" — never treat it as 0. */
  gpa: number | null
  totalCredits: number
  included: GpaCourseLine[]
  excluded: GpaExclusion[]
}

export function calculateGpa(courses: Course[], results: CourseResult[]): GpaResult {
  const resultByCourse = new Map(results.map((r) => [r.course_id, r]))
  const included: GpaCourseLine[] = []
  const excluded: GpaExclusion[] = []

  for (const course of courses) {
    const result = resultByCourse.get(course.id)
    const reason = exclusionReason(course, result)
    if (reason) {
      excluded.push({ course, reason })
    } else {
      // exclusionReason() returned null, so result and grade points exist.
      included.push({
        course,
        gradePoints: result!.final_grade_points!,
        gradeLetter: result!.final_grade_letter,
      })
    }
  }

  const totalCredits = included.reduce((sum, line) => sum + line.course.credits, 0)
  const weightedPoints = included.reduce(
    (sum, line) => sum + line.gradePoints * line.course.credits,
    0,
  )

  return {
    gpa: totalCredits > 0 ? weightedPoints / totalCredits : null,
    totalCredits,
    included,
    excluded,
  }
}

function exclusionReason(
  course: Course,
  result: CourseResult | undefined,
): GpaExclusionReason | null {
  if (!result) return 'no_result'
  if (!result.is_finalized) return 'not_finalized'
  if (result.final_grade_points === null) return 'missing_grade_points'
  if (!(course.credits > 0)) return 'no_credits'
  return null
}

/** Formats a GPA for display. GPAs are conventionally shown with 2 decimals. */
export function formatGpa(gpa: number | null): string {
  return gpa === null ? 'Insufficient data' : gpa.toFixed(2)
}
