import { describe, expect, it } from 'vitest'
import {
  courseResultSchema,
  gradeEntrySchema,
  gradeScaleEntrySchema,
  studyLogSchema,
  studyTimerSchema,
} from '@/lib/schemas'

describe('gradeEntrySchema', () => {
  const valid = { assessment_name: ' Midterm ', score: '42.5', max_score: '50', weight_percent: '30' }

  it('converts numbers and trims the name', () => {
    expect(gradeEntrySchema.parse(valid)).toEqual({
      assessment_name: 'Midterm',
      score: 42.5,
      max_score: 50,
      weight_percent: 30,
    })
  })

  it('allows an ungraded assessment (no score yet) and no weight', () => {
    expect(gradeEntrySchema.parse({ ...valid, score: '', weight_percent: '' })).toMatchObject({
      score: null,
      weight_percent: null,
    })
  })

  it('allows bonus marks above the maximum', () => {
    expect(gradeEntrySchema.safeParse({ ...valid, score: '55' }).success).toBe(true)
  })

  it('rejects negative or badly formatted numbers', () => {
    for (const score of ['-1', 'abc', '1.234', '1e3']) {
      expect(gradeEntrySchema.safeParse({ ...valid, score }).success, score).toBe(false)
    }
  })

  it('rejects a maximum of 0 and weights above 100', () => {
    expect(gradeEntrySchema.safeParse({ ...valid, max_score: '0' }).success).toBe(false)
    expect(gradeEntrySchema.safeParse({ ...valid, weight_percent: '100.5' }).success).toBe(false)
    expect(gradeEntrySchema.safeParse({ ...valid, weight_percent: '100' }).success).toBe(true)
  })

  it('needs a maximum when a score is given, reported on max_score', () => {
    const res = gradeEntrySchema.safeParse({ ...valid, max_score: '' })
    expect(res.success).toBe(false)
    expect(res.error?.issues[0].path).toEqual(['max_score'])
  })
})

describe('courseResultSchema', () => {
  it('accepts a letter with points, or points alone, or a letter alone (e.g. Pass)', () => {
    expect(courseResultSchema.parse({ final_grade_letter: 'A-', final_grade_points: '3.67', is_finalized: true })).toEqual({
      final_grade_letter: 'A-',
      final_grade_points: 3.67,
      is_finalized: true,
    })
    expect(courseResultSchema.safeParse({ final_grade_letter: '', final_grade_points: '3', is_finalized: true }).success).toBe(true)
    expect(courseResultSchema.safeParse({ final_grade_letter: 'P', final_grade_points: '', is_finalized: true }).success).toBe(true)
  })

  it('does not allow marking an empty grade as final', () => {
    const res = courseResultSchema.safeParse({ final_grade_letter: '', final_grade_points: '', is_finalized: true })
    expect(res.success).toBe(false)
    expect(res.error?.issues[0].path).toEqual(['final_grade_letter'])
  })

  it('allows saving a draft with no grade yet', () => {
    expect(courseResultSchema.safeParse({ final_grade_letter: '', final_grade_points: '', is_finalized: false }).success).toBe(true)
  })

  it('keeps grade points within the database range', () => {
    expect(courseResultSchema.safeParse({ final_grade_letter: '', final_grade_points: '21', is_finalized: false }).success).toBe(false)
  })
})

describe('gradeScaleEntrySchema', () => {
  it('requires a letter and 0-20 points', () => {
    expect(gradeScaleEntrySchema.parse({ grade_letter: ' B+ ', grade_points: '3.33' })).toEqual({
      grade_letter: 'B+',
      grade_points: 3.33,
    })
    expect(gradeScaleEntrySchema.safeParse({ grade_letter: '', grade_points: '3' }).success).toBe(false)
    expect(gradeScaleEntrySchema.safeParse({ grade_letter: 'A', grade_points: '' }).success).toBe(false)
    expect(gradeScaleEntrySchema.safeParse({ grade_letter: 'A', grade_points: '25' }).success).toBe(false)
  })
})

describe('studyTimerSchema', () => {
  it('treats "no course" as null', () => {
    expect(studyTimerSchema.parse({ course_id: '', notes: '' })).toEqual({ course_id: null, notes: null })
  })
})

describe('studyLogSchema', () => {
  const valid = { course_id: 'c1', date: '2026-10-14', start_time: '19:00', duration_minutes: '90', notes: '' }

  it('computes start, end and duration from local date, time and minutes', () => {
    expect(studyLogSchema.parse(valid)).toEqual({
      course_id: 'c1',
      notes: null,
      started_at: new Date(2026, 9, 14, 19, 0).toISOString(),
      ended_at: new Date(2026, 9, 14, 20, 30).toISOString(),
      duration_seconds: 5400,
    })
  })

  it('rejects durations of 0, fractions, or over 24 hours', () => {
    for (const duration_minutes of ['0', '1.5', '1441', '']) {
      expect(studyLogSchema.safeParse({ ...valid, duration_minutes }).success, duration_minutes).toBe(false)
    }
  })
})
