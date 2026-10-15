import type { GradeEntry, GradeScaleEntry } from '@/types/database'

/**
 * Course results calculated from assessment scores.
 *
 * Three different things, deliberately kept apart:
 *  1. Assessment score: one raw mark, e.g. 42 / 50.
 *  2. Course result: the weighted average of graded assessments, calculated
 *     here. It's only a calculation, never assumed to be the official grade.
 *  3. Final grade: letter/points the student enters (see course_results);
 *     only that counts toward GPA (see gpa.ts).
 */

/** Percentage for one assessment, or null if it isn't graded yet / has no maximum. */
export function assessmentPercent(entry: Pick<GradeEntry, 'score' | 'max_score'>): number | null {
  if (entry.score === null || entry.max_score === null || entry.max_score <= 0) return null
  return (entry.score / entry.max_score) * 100
}

export type CourseStanding =
  | {
      status: 'insufficient'
      /** Plain-language reason, shown in place of a number. */
      reason: string
    }
  | {
      status: 'ok'
      /** Weighted average of the graded assessments, 0–100+ (bonus marks can exceed 100). */
      average: number
      /** Sum of weights of graded assessments: how much of the course is graded so far. */
      gradedWeight: number
      /** Sum of weights of all weighted assessments, graded or not. */
      totalWeight: number
      /** True when every weighted assessment is graded and weights add up to 100%. */
      isComplete: boolean
    }

/** Floating-point safe check that weights add up to 100. */
const isHundred = (n: number) => Math.abs(n - 100) < 0.01

/**
 * Weighted average of graded assessments:
 *
 *   average = sum(percent × weight) / sum(weight)   (graded assessments only)
 *
 * Assessments without a weight are left out (we don't guess how much they
 * count), and so are assessments without a score yet.
 */
export function calculateCourseStanding(entries: GradeEntry[]): CourseStanding {
  if (entries.length === 0) return { status: 'insufficient', reason: 'No assessments recorded yet' }

  const weighted = entries.filter((e) => e.weight_percent !== null && e.weight_percent > 0)
  if (weighted.length === 0) {
    return { status: 'insufficient', reason: 'Add assessment weights to calculate a course result' }
  }

  const graded = weighted.filter((e) => assessmentPercent(e) !== null)
  if (graded.length === 0) return { status: 'insufficient', reason: 'No weighted assessments are graded yet' }

  const gradedWeight = graded.reduce((sum, e) => sum + e.weight_percent!, 0)
  const totalWeight = weighted.reduce((sum, e) => sum + e.weight_percent!, 0)
  const weightedSum = graded.reduce((sum, e) => sum + assessmentPercent(e)! * e.weight_percent!, 0)

  return {
    status: 'ok',
    average: weightedSum / gradedWeight,
    gradedWeight,
    totalWeight,
    isComplete: graded.length === weighted.length && isHundred(totalWeight),
  }
}

/** Notes worth showing next to a course's assessments, e.g. weights not adding up. */
export function getGradeWarnings(entries: GradeEntry[]): string[] {
  const warnings: string[] = []
  const weighted = entries.filter((e) => e.weight_percent !== null && e.weight_percent > 0)
  const totalWeight = weighted.reduce((sum, e) => sum + e.weight_percent!, 0)

  if (weighted.length > 0 && !isHundred(totalWeight)) {
    warnings.push(`Weights add up to ${formatNumber(totalWeight)}%, not 100%.`)
  }
  const unweighted = entries.filter((e) => e.weight_percent === null || e.weight_percent === 0).length
  if (unweighted > 0 && weighted.length > 0) {
    warnings.push(
      `${unweighted} ${unweighted === 1 ? 'assessment has' : 'assessments have'} no weight and ${unweighted === 1 ? "isn't" : "aren't"} included in the course result.`,
    )
  }
  return warnings
}

/** Scale entries from highest to lowest points, for menus and tables. */
export function sortScale(scale: GradeScaleEntry[]): GradeScaleEntry[] {
  return [...scale].sort((a, b) => b.grade_points - a.grade_points || a.grade_letter.localeCompare(b.grade_letter))
}

/** Points for a letter in the user's scale (case-insensitive), or null if it isn't in the scale. */
export function pointsForLetter(scale: GradeScaleEntry[], letter: string): number | null {
  const match = scale.find((s) => s.grade_letter.toLowerCase() === letter.trim().toLowerCase())
  return match ? match.grade_points : null
}

/** 85 -> "85", 84.567 -> "84.57", 3.5 -> "3.5" */
export function formatNumber(n: number, maxDecimals = 2): string {
  return Number(n.toFixed(maxDecimals)).toString()
}

/** Common grading scales, offered as editable starting points (never applied automatically). */
export const GRADE_SCALE_PRESETS: Array<{ id: string; name: string; description: string; entries: Array<[string, number]> }> = [
  {
    id: '4.0-tenths',
    name: '4.0 scale (A- = 3.7)',
    description: 'A, A-, B+ … F with steps of 0.3–0.4',
    entries: [
      ['A', 4.0], ['A-', 3.7], ['B+', 3.3], ['B', 3.0], ['B-', 2.7], ['C+', 2.3],
      ['C', 2.0], ['C-', 1.7], ['D+', 1.3], ['D', 1.0], ['F', 0],
    ],
  },
  {
    id: '4.0-thirds',
    name: '4.0 scale (A- = 3.67)',
    description: 'A, A-, B+ … F with steps of one third',
    entries: [
      ['A', 4.0], ['A-', 3.67], ['B+', 3.33], ['B', 3.0], ['B-', 2.67], ['C+', 2.33],
      ['C', 2.0], ['C-', 1.67], ['D+', 1.33], ['D', 1.0], ['F', 0],
    ],
  },
]
