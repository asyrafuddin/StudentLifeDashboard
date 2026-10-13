import { format } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { getMonthGrid } from '@/lib/calendar'
import { describeCourseDeletion, searchCourses } from '@/lib/courses'
import { createDemoData } from '@/lib/demo-data'

const none = { assignments: 0, exams: 0, classSessions: 0, gradeEntries: 0, courseResults: 0, studySessions: 0 }

describe('describeCourseDeletion', () => {
  it('reports nothing for a course without linked records', () => {
    expect(describeCourseDeletion(none)).toEqual({ deleted: [], unlinked: [], hasRelatedRecords: false })
  })

  it('lists deleted records with correct plurals, and unlinked study sessions separately', () => {
    const impact = describeCourseDeletion({
      assignments: 3,
      exams: 1,
      classSessions: 2,
      gradeEntries: 1,
      courseResults: 1,
      studySessions: 4,
    })
    expect(impact.deleted).toEqual([
      '3 assignments',
      '1 exam',
      '2 timetable classes',
      '1 grade entry',
      'the final course grade',
    ])
    expect(impact.unlinked).toEqual(['4 study sessions'])
    expect(impact.hasRelatedRecords).toBe(true)
  })

  it('counts study sessions alone as related records', () => {
    expect(describeCourseDeletion({ ...none, studySessions: 1 }).hasRelatedRecords).toBe(true)
  })
})

describe('searchCourses', () => {
  const courses = createDemoData(new Date(2026, 9, 13)).courses

  it('matches code, name or instructor, ignoring case', () => {
    expect(searchCourses(courses, 'cs2').map((c) => c.course_code)).toEqual(['CS201'])
    expect(searchCourses(courses, 'algebra').map((c) => c.course_code)).toEqual(['MATH210'])
    expect(searchCourses(courses, 'rivera').map((c) => c.course_code)).toEqual(['CS201', 'CS101'])
  })

  it('returns everything for an empty search', () => {
    expect(searchCourses(courses, '  ')).toHaveLength(courses.length)
  })
})

describe('getMonthGrid', () => {
  it('starts on Monday and covers whole weeks', () => {
    // October 2026 starts on a Thursday and ends on a Saturday.
    const weeks = getMonthGrid(new Date(2026, 9, 15))
    expect(weeks).toHaveLength(5)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(format(weeks[0][0], 'yyyy-MM-dd EEE')).toBe('2026-09-28 Mon')
    expect(format(weeks[4][6], 'yyyy-MM-dd EEE')).toBe('2026-11-01 Sun')
  })

  it('handles a month that needs six rows', () => {
    // August 2026 starts on a Saturday and has 31 days.
    expect(getMonthGrid(new Date(2026, 7, 1))).toHaveLength(6)
  })
})
