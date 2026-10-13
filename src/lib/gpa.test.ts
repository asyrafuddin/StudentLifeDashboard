import { describe, expect, it } from 'vitest'
import { calculateGpa, formatGpa } from '@/lib/gpa'
import type { Course, CourseResult } from '@/types/database'

function course(id: string, credits: number): Course {
  return {
    id,
    user_id: 'u1',
    semester_id: 's1',
    course_code: id.toUpperCase(),
    course_name: `Course ${id}`,
    instructor: null,
    credits,
    color: '#6366f1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

function result(
  course_id: string,
  points: number | null,
  is_finalized = true,
  letter: string | null = null,
): CourseResult {
  return {
    id: `r-${course_id}`,
    user_id: 'u1',
    course_id,
    final_grade_letter: letter,
    final_grade_points: points,
    is_finalized,
    updated_at: '2026-01-01T00:00:00Z',
  }
}

describe('calculateGpa', () => {
  it('weights grade points by credits (not a simple average)', () => {
    // (4.0 × 4 + 2.0 × 1) / 5 = 3.6. A simple average would wrongly give 3.0.
    const res = calculateGpa(
      [course('a', 4), course('b', 1)],
      [result('a', 4.0), result('b', 2.0)],
    )
    expect(res.gpa).toBeCloseTo(3.6)
    expect(res.totalCredits).toBe(5)
    expect(res.excluded).toEqual([])
  })

  it('returns null (insufficient data) when no course qualifies', () => {
    const res = calculateGpa([course('a', 3)], [])
    expect(res.gpa).toBeNull()
    expect(res.totalCredits).toBe(0)
    expect(formatGpa(res.gpa)).toBe('Insufficient data')
  })

  it('returns null for an empty course list', () => {
    expect(calculateGpa([], []).gpa).toBeNull()
  })

  it('excludes courses and reports why', () => {
    const res = calculateGpa(
      [course('ok', 3), course('none', 3), course('draft', 3), course('nopts', 3), course('zero', 0)],
      [
        result('ok', 3.0),
        result('draft', 4.0, false),
        result('nopts', null),
        result('zero', 4.0),
      ],
    )
    expect(res.gpa).toBeCloseTo(3.0)
    expect(res.included.map((l) => l.course.id)).toEqual(['ok'])
    expect(res.excluded.map((e) => [e.course.id, e.reason])).toEqual([
      ['none', 'no_result'],
      ['draft', 'not_finalized'],
      ['nopts', 'missing_grade_points'],
      ['zero', 'no_credits'],
    ])
  })

  it('counts a finalized 0.0 grade (a fail is real data, not missing data)', () => {
    const res = calculateGpa(
      [course('a', 3), course('b', 3)],
      [result('a', 4.0), result('b', 0)],
    )
    expect(res.gpa).toBeCloseTo(2.0)
  })

  it('handles fractional credits', () => {
    const res = calculateGpa(
      [course('a', 1.5), course('b', 0.5)],
      [result('a', 3.0), result('b', 4.0)],
    )
    // (3.0 × 1.5 + 4.0 × 0.5) / 2 = 3.25
    expect(res.gpa).toBeCloseTo(3.25)
  })

  it('formats with two decimals', () => {
    expect(formatGpa(3.666666)).toBe('3.67')
  })
})
