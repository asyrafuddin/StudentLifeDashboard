import { describe, expect, it } from 'vitest'
import {
  getCourseProgress,
  getDeadlineState,
  getSummaryStats,
  getTodaysClasses,
  getUpcomingDeadlines,
  getUpcomingExams,
  getWeeklyStudyMinutes,
  pickDefaultSemester,
  scopeToSemester,
} from '@/lib/dashboard-stats'
import { createDemoData, createEmptyDemoData } from '@/lib/demo-data'
import type { Assignment, AssignmentStatus, ClassSession, StudySession } from '@/types/database'

// A fixed "now": Tuesday 13 October 2026, 12:00 local time.
const NOW = new Date(2026, 9, 13, 12, 0, 0)

function assignment(
  id: string,
  due_at: string | null,
  status: AssignmentStatus = 'not_started',
  course_id = 'c1',
): Assignment {
  return {
    id,
    user_id: 'u1',
    course_id,
    title: id,
    description: null,
    due_at,
    priority: 'medium',
    status,
    estimated_minutes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }
}

const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3600_000).toISOString()

describe('getDeadlineState', () => {
  it('classifies deadlines relative to now', () => {
    expect(getDeadlineState(assignment('a', hoursFromNow(-1)), NOW)).toBe('overdue')
    expect(getDeadlineState(assignment('a', hoursFromNow(10)), NOW)).toBe('due_soon')
    expect(getDeadlineState(assignment('a', hoursFromNow(72)), NOW)).toBe('upcoming')
    expect(getDeadlineState(assignment('a', null), NOW)).toBe('no_due_date')
  })

  it('never marks a completed assignment as overdue', () => {
    expect(getDeadlineState(assignment('a', hoursFromNow(-48), 'completed'), NOW)).toBe('completed')
  })
})

describe('getUpcomingDeadlines', () => {
  it('sorts by nearest deadline and skips completed / undated work', () => {
    const list = getUpcomingDeadlines([
      assignment('later', hoursFromNow(50)),
      assignment('done', hoursFromNow(1), 'completed'),
      assignment('overdue', hoursFromNow(-5)),
      assignment('undated', null),
      assignment('soon', hoursFromNow(3)),
    ])
    expect(list.map((a) => a.id)).toEqual(['overdue', 'soon', 'later'])
  })

  it('sorts by real time even when timestamps use different UTC offsets', () => {
    // 09:00 at +08:00 is 01:00 UTC, i.e. earlier than 02:00Z, though it sorts later as text.
    const list = getUpcomingDeadlines([
      assignment('utc', '2026-10-20T02:00:00Z'),
      assignment('plus8', '2026-10-20T09:00:00+08:00'),
    ])
    expect(list.map((a) => a.id)).toEqual(['plus8', 'utc'])
  })

  it('respects the limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => assignment(`a${i}`, hoursFromNow(i + 1)))
    expect(getUpcomingDeadlines(many, 3)).toHaveLength(3)
  })
})

describe('getSummaryStats', () => {
  it('counts records from the data instead of hardcoded numbers', () => {
    const data = createDemoData(NOW)
    const scope = scopeToSemester(data, 'demo-sem-current')
    const stats = getSummaryStats(scope, NOW)

    expect(stats.courseCount).toBe(4)
    expect(stats.pendingAssignments + stats.completedAssignments).toBe(scope.assignments.length)
    expect(stats.overdueAssignments).toBe(1)
    expect(stats.upcomingExams).toBe(3) // the 4th demo exam is in the past
  })

  it('returns zeros for an empty account', () => {
    const data = createEmptyDemoData(NOW)
    const scope = scopeToSemester(data, 'demo-sem-current')
    expect(getSummaryStats(scope, NOW)).toEqual({
      courseCount: 0,
      pendingAssignments: 0,
      overdueAssignments: 0,
      upcomingExams: 0,
      completedAssignments: 0,
    })
  })
})

describe('scopeToSemester', () => {
  it('only includes records whose course belongs to the semester', () => {
    const data = createDemoData(NOW)
    const previous = scopeToSemester(data, 'demo-sem-previous')
    expect(previous.courses.map((c) => c.course_code).sort()).toEqual(['CS101', 'HIST120', 'MATH101'])
    expect(previous.assignments).toEqual([])
    expect(previous.courseResults).toHaveLength(3)
  })
})

describe('pickDefaultSemester', () => {
  it('prefers the semester marked current', () => {
    const data = createDemoData(NOW)
    expect(pickDefaultSemester(data.semesters)?.id).toBe('demo-sem-current')
  })

  it('returns null when there are no semesters', () => {
    expect(pickDefaultSemester([])).toBeNull()
  })
})

describe('getUpcomingExams', () => {
  it('returns only future exams in chronological order', () => {
    const data = createDemoData(NOW)
    const exams = getUpcomingExams(data.exams, NOW)
    const times = exams.map((e) => new Date(e.starts_at).getTime())
    expect(times.every((t) => t >= NOW.getTime())).toBe(true)
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })
})

describe('getTodaysClasses', () => {
  it('returns classes for the current weekday sorted by start time', () => {
    const make = (id: string, day: 1 | 2 | 3, start: string): ClassSession => ({
      id,
      user_id: 'u1',
      course_id: 'c1',
      day_of_week: day,
      start_time: start,
      end_time: '23:00:00',
      location: null,
      instructor: null,
      created_at: '',
      updated_at: '',
    })
    // NOW is a Tuesday (ISO day 2).
    const result = getTodaysClasses(
      [make('mon', 1, '09:00:00'), make('tue-late', 2, '14:00:00'), make('tue-early', 2, '08:30:00')],
      NOW,
    )
    expect(result.map((s) => s.id)).toEqual(['tue-early', 'tue-late'])
  })
})

describe('getWeeklyStudyMinutes', () => {
  const study = (id: string, started: Date, seconds: number | null): StudySession => ({
    id,
    user_id: 'u1',
    course_id: null,
    started_at: started.toISOString(),
    ended_at: null,
    duration_seconds: seconds,
    notes: null,
    created_at: '',
  })

  it('returns Monday to Sunday and sums finished sessions per day', () => {
    const week = getWeeklyStudyMinutes(
      [
        study('mon-1', new Date(2026, 9, 12, 9), 30 * 60),
        study('mon-2', new Date(2026, 9, 12, 20), 45 * 60),
        study('tue', new Date(2026, 9, 13, 8), 60 * 60),
        study('running', new Date(2026, 9, 13, 11), null), // still in progress
        study('last-week', new Date(2026, 9, 11, 10), 999 * 60), // Sunday before
      ],
      NOW,
    )
    expect(week.map((d) => d.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(week.map((d) => d.minutes)).toEqual([75, 60, 0, 0, 0, 0, 0])
  })
})

describe('getCourseProgress', () => {
  it('uses null (not 0%) for courses without assignments', () => {
    const data = createDemoData(NOW)
    const courses = data.courses.filter((c) => c.id === 'demo-cs201' || c.id === 'demo-cs101')
    const progress = getCourseProgress(courses, [
      assignment('a', null, 'completed', 'demo-cs201'),
      assignment('b', null, 'in_progress', 'demo-cs201'),
    ])
    expect(progress.find((p) => p.course.id === 'demo-cs201')).toMatchObject({
      total: 2,
      completed: 1,
      percent: 50,
    })
    expect(progress.find((p) => p.course.id === 'demo-cs101')?.percent).toBeNull()
  })
})
