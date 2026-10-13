import { describe, expect, it } from 'vitest'
import {
  assignmentSchema,
  classSessionSchema,
  courseSchema,
  examSchema,
  isValidTimezone,
  profileSchema,
  semesterSchema,
  signInSchema,
  signUpSchema,
} from '@/lib/schemas'

describe('signInSchema', () => {
  it('trims the email and accepts valid input', () => {
    expect(signInSchema.parse({ email: '  me@uni.edu ', password: 'x' })).toEqual({
      email: 'me@uni.edu',
      password: 'x',
    })
  })

  it('rejects malformed emails and empty passwords', () => {
    expect(signInSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false)
    expect(signInSchema.safeParse({ email: 'me@uni.edu', password: '' }).success).toBe(false)
  })
})

describe('signUpSchema', () => {
  const valid = {
    displayName: 'Alex',
    email: 'alex@uni.edu',
    password: 'correct-horse',
    confirmPassword: 'correct-horse',
  }

  it('accepts valid input', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true)
  })

  it('requires matching passwords and reports it on confirmPassword', () => {
    const res = signUpSchema.safeParse({ ...valid, confirmPassword: 'different' })
    expect(res.success).toBe(false)
    expect(res.error?.issues[0].path).toEqual(['confirmPassword'])
  })

  it('requires a minimum password length', () => {
    expect(signUpSchema.safeParse({ ...valid, password: 'short', confirmPassword: 'short' }).success).toBe(false)
  })

  it('rejects a whitespace-only name', () => {
    expect(signUpSchema.safeParse({ ...valid, displayName: '   ' }).success).toBe(false)
  })
})

describe('profileSchema', () => {
  it('saves an empty university as null', () => {
    const res = profileSchema.parse({ display_name: 'Alex', university_name: '  ', timezone: 'UTC' })
    expect(res.university_name).toBeNull()
  })

  it('rejects unknown timezones', () => {
    expect(profileSchema.safeParse({ display_name: 'A', university_name: '', timezone: 'Mars/Base' }).success).toBe(false)
  })

  it('enforces the same length limit as the database', () => {
    expect(
      profileSchema.safeParse({ display_name: 'x'.repeat(101), university_name: '', timezone: 'UTC' }).success,
    ).toBe(false)
  })
})

describe('isValidTimezone', () => {
  it('recognizes IANA names', () => {
    expect(isValidTimezone('Asia/Kuala_Lumpur')).toBe(true)
    expect(isValidTimezone('Nowhere/Special')).toBe(false)
  })
})

describe('semesterSchema', () => {
  const valid = { name: 'Fall 2026', start_date: '2026-09-01', end_date: '2026-12-20', is_current: true }

  it('accepts a valid semester', () => {
    expect(semesterSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects an end date before the start date, reported on end_date', () => {
    const res = semesterSchema.safeParse({ ...valid, end_date: '2026-08-01' })
    expect(res.success).toBe(false)
    expect(res.error?.issues[0].path).toEqual(['end_date'])
  })

  it('requires both dates', () => {
    expect(semesterSchema.safeParse({ ...valid, start_date: '' }).success).toBe(false)
  })
})

describe('courseSchema', () => {
  const valid = {
    semester_id: 'sem-1',
    course_code: ' CS201 ',
    course_name: 'Data Structures',
    instructor: '',
    credits: '3',
    color: '#6366f1',
  }

  it('trims text, converts credits to a number and empty instructor to null', () => {
    expect(courseSchema.parse(valid)).toEqual({
      semester_id: 'sem-1',
      course_code: 'CS201',
      course_name: 'Data Structures',
      instructor: null,
      credits: 3,
      color: '#6366f1',
    })
  })

  it('accepts zero and one-decimal credits', () => {
    expect(courseSchema.parse({ ...valid, credits: '0' }).credits).toBe(0)
    expect(courseSchema.parse({ ...valid, credits: '1.5' }).credits).toBe(1.5)
  })

  it('rejects negative, non-numeric, too precise or empty credits', () => {
    for (const credits of ['-1', 'three', '1.25', '', '100']) {
      expect(courseSchema.safeParse({ ...valid, credits }).success, credits).toBe(false)
    }
  })

  it('rejects colors that are not 6-digit hex', () => {
    expect(courseSchema.safeParse({ ...valid, color: 'blue' }).success).toBe(false)
  })
})

describe('assignmentSchema', () => {
  const valid = {
    course_id: 'course-1',
    title: 'Problem set 4',
    description: '',
    due_date: '2026-10-20',
    due_time: '14:30',
    priority: 'high' as const,
    status: 'not_started' as const,
    estimated_minutes: '90',
  }

  it('combines date and time into a timestamp (local time)', () => {
    const res = assignmentSchema.parse(valid)
    expect(res.due_at).toBe(new Date(2026, 9, 20, 14, 30).toISOString())
    expect(res).not.toHaveProperty('due_date')
    expect(res.estimated_minutes).toBe(90)
    expect(res.description).toBeNull()
  })

  it('defaults to 11:59 PM when only a date is given', () => {
    const res = assignmentSchema.parse({ ...valid, due_time: '' })
    expect(res.due_at).toBe(new Date(2026, 9, 20, 23, 59).toISOString())
  })

  it('allows no due date at all', () => {
    expect(assignmentSchema.parse({ ...valid, due_date: '', due_time: '' }).due_at).toBeNull()
  })

  it('rejects a time without a date', () => {
    const res = assignmentSchema.safeParse({ ...valid, due_date: '' })
    expect(res.success).toBe(false)
    expect(res.error?.issues[0].path).toEqual(['due_date'])
  })

  it('rejects invalid estimates and unknown priorities', () => {
    for (const estimated_minutes of ['0', '-5', '1.5', 'abc']) {
      expect(assignmentSchema.safeParse({ ...valid, estimated_minutes }).success, estimated_minutes).toBe(false)
    }
    expect(assignmentSchema.safeParse({ ...valid, priority: 'urgent' }).success).toBe(false)
  })

  it('requires a title and a course', () => {
    expect(assignmentSchema.safeParse({ ...valid, title: '  ' }).success).toBe(false)
    expect(assignmentSchema.safeParse({ ...valid, course_id: '' }).success).toBe(false)
  })
})

describe('examSchema', () => {
  const valid = {
    course_id: 'c1',
    title: 'Midterm',
    exam_type: 'Midterm',
    date: '2026-11-03',
    time: '09:00',
    location: '  Hall B ',
    notes: '',
  }

  it('combines date and time into a local timestamp and tidies optional text', () => {
    expect(examSchema.parse(valid)).toEqual({
      course_id: 'c1',
      title: 'Midterm',
      exam_type: 'Midterm',
      location: 'Hall B',
      notes: null,
      starts_at: new Date(2026, 10, 3, 9, 0).toISOString(),
    })
  })

  it('requires both a date and a time', () => {
    expect(examSchema.safeParse({ ...valid, date: '' }).success).toBe(false)
    expect(examSchema.safeParse({ ...valid, time: '' }).success).toBe(false)
  })

  it('limits the exam type length like the database', () => {
    expect(examSchema.safeParse({ ...valid, exam_type: 'x'.repeat(51) }).success).toBe(false)
  })
})

describe('classSessionSchema', () => {
  const valid = {
    course_id: 'c1',
    day_of_week: '3',
    start_time: '09:00',
    end_time: '10:30',
    location: 'Room 101',
    instructor: '',
  }

  it('converts the day to a number and empty instructor to null', () => {
    expect(classSessionSchema.parse(valid)).toEqual({
      course_id: 'c1',
      day_of_week: 3,
      start_time: '09:00',
      end_time: '10:30',
      location: 'Room 101',
      instructor: null,
    })
  })

  it('rejects an end time at or before the start time, reported on end_time', () => {
    for (const end_time of ['09:00', '08:59']) {
      const res = classSessionSchema.safeParse({ ...valid, end_time })
      expect(res.success, end_time).toBe(false)
      expect(res.error?.issues[0].path).toEqual(['end_time'])
    }
  })

  it('rejects days outside Monday (1) to Sunday (7)', () => {
    expect(classSessionSchema.safeParse({ ...valid, day_of_week: '0' }).success).toBe(false)
    expect(classSessionSchema.safeParse({ ...valid, day_of_week: '8' }).success).toBe(false)
  })
})
