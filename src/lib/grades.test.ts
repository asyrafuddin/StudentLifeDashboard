import { describe, expect, it } from 'vitest'
import {
  assessmentPercent,
  calculateCourseStanding,
  formatNumber,
  getGradeWarnings,
  pointsForLetter,
  sortScale,
} from '@/lib/grades'
import type { GradeEntry, GradeScaleEntry } from '@/types/database'

function entry(name: string, score: number | null, max: number | null, weight: number | null): GradeEntry {
  return {
    id: name,
    user_id: 'u1',
    course_id: 'c1',
    assessment_name: name,
    score,
    max_score: max,
    weight_percent: weight,
    created_at: '',
    updated_at: '',
  }
}

describe('assessmentPercent', () => {
  it('converts a raw score to a percentage', () => {
    expect(assessmentPercent(entry('q', 42, 50, 10))).toBe(84)
  })

  it('returns null when not graded or no maximum', () => {
    expect(assessmentPercent(entry('q', null, 50, 10))).toBeNull()
    expect(assessmentPercent(entry('q', 42, null, 10))).toBeNull()
  })

  it('allows bonus marks above 100%', () => {
    expect(assessmentPercent(entry('q', 11, 10, 10))).toBeCloseTo(110)
  })
})

describe('calculateCourseStanding', () => {
  it('weights each assessment by its weight, not equally', () => {
    // Quiz 100% worth 10%, exam 50% worth 90% -> (100*10 + 50*90) / 100 = 55%.
    // A simple average would wrongly give 75%.
    const res = calculateCourseStanding([entry('Quiz', 10, 10, 10), entry('Exam', 50, 100, 90)])
    expect(res).toMatchObject({ status: 'ok', gradedWeight: 100, totalWeight: 100, isComplete: true })
    expect(res.status === 'ok' && res.average).toBeCloseTo(55)
  })

  it('averages only the graded part while the course is in progress', () => {
    // Midterm 80% (30%) graded; final (70%) not yet -> average 80% over 30% of the course.
    const res = calculateCourseStanding([entry('Midterm', 40, 50, 30), entry('Final', null, 100, 70)])
    expect(res).toMatchObject({ status: 'ok', gradedWeight: 30, totalWeight: 100, isComplete: false })
    expect(res.status === 'ok' && res.average).toBeCloseTo(80)
  })

  it('leaves out assessments without a weight instead of guessing', () => {
    const res = calculateCourseStanding([entry('Lab', 50, 100, 50), entry('Bonus quiz', 10, 10, null)])
    expect(res.status === 'ok' && res.average).toBeCloseTo(50)
  })

  it('reports insufficient data with a reason', () => {
    expect(calculateCourseStanding([])).toEqual({ status: 'insufficient', reason: 'No assessments recorded yet' })
    expect(calculateCourseStanding([entry('Quiz', 8, 10, null)])).toMatchObject({
      status: 'insufficient',
      reason: expect.stringContaining('weights'),
    })
    expect(calculateCourseStanding([entry('Quiz', null, 10, 20)])).toMatchObject({
      status: 'insufficient',
      reason: 'No weighted assessments are graded yet',
    })
  })

  it('is not "complete" when weights do not add up to 100', () => {
    const res = calculateCourseStanding([entry('A', 8, 10, 40), entry('B', 9, 10, 40)])
    expect(res).toMatchObject({ status: 'ok', isComplete: false, totalWeight: 80 })
  })
})

describe('getGradeWarnings', () => {
  it('warns when weights do not add up to 100% and about unweighted assessments', () => {
    expect(getGradeWarnings([entry('A', 1, 1, 60), entry('B', 1, 1, 30), entry('C', 1, 1, null)])).toEqual([
      'Weights add up to 90%, not 100%.',
      "1 assessment has no weight and isn't included in the course result.",
    ])
  })

  it('has no warnings for a well-formed course', () => {
    expect(getGradeWarnings([entry('A', 1, 1, 33.33), entry('B', 1, 1, 33.33), entry('C', 1, 1, 33.34)])).toEqual([])
  })
})

describe('grade scale helpers', () => {
  const scale = [
    { id: '1', grade_letter: 'B', grade_points: 3 },
    { id: '2', grade_letter: 'A', grade_points: 4 },
    { id: '3', grade_letter: 'A-', grade_points: 3.7 },
  ] as GradeScaleEntry[]

  it('sorts from highest to lowest points', () => {
    expect(sortScale(scale).map((s) => s.grade_letter)).toEqual(['A', 'A-', 'B'])
  })

  it('looks up points by letter, ignoring case and spaces', () => {
    expect(pointsForLetter(scale, ' a- ')).toBe(3.7)
    expect(pointsForLetter(scale, 'C')).toBeNull()
  })
})

describe('formatNumber', () => {
  it('rounds to 2 decimals without trailing zeros', () => {
    expect(formatNumber(85)).toBe('85')
    expect(formatNumber(84.567)).toBe('84.57')
    expect(formatNumber(3.5)).toBe('3.5')
  })
})
