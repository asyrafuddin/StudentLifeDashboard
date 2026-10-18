import { describe, expect, it } from 'vitest'
import {
  ASSISTANT_LIMITS,
  type AssistantRequest,
  assistantRequestSchema,
  studyPlanSchema,
} from '@shared/study-assistant-contract'
import { buildAssistantInput, buildRuleBasedPlan } from '@/lib/assistant'
import type { DashboardData } from '@/lib/dashboard-stats'
import { createDemoData } from '@/lib/demo-data'
import type { Assignment, Course, Exam, StudySession } from '@/types/database'

// Sunday 18 Oct 2026, 09:00 local time.
const NOW = new Date(2026, 9, 18, 9, 0)
const at = (day: number, hour = 9, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString()

const course = (id: string, code: string, extra: Partial<Course> = {}): Course =>
  ({ id, user_id: 'u', semester_id: 'fall', course_code: code, course_name: `${code} name`, credits: 3, color: '#6366f1', instructor: 'Dr Secret', ...extra }) as Course

const assignment = (id: string, due: string | null, extra: Partial<Assignment> = {}): Assignment =>
  ({ id, user_id: 'u', course_id: 'cs', title: `Task ${id}`, description: 'private description', due_at: due, priority: 'medium', status: 'not_started', estimated_minutes: null, ...extra }) as Assignment

function data(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    profile: { id: 'u', display_name: 'Nur Aisyah', university_name: 'Example U', timezone: 'UTC', created_at: '', updated_at: '' },
    semesters: [{ id: 'fall', user_id: 'u', name: 'Fall 2026', start_date: '2026-09-01', end_date: '2026-12-20', is_current: true, created_at: '' }],
    courses: [course('cs', 'CS201'), course('ma', 'MA101'), course('old', 'OLD100', { semester_id: 'spring' })],
    assignments: [],
    exams: [],
    classSessions: [],
    courseResults: [],
    studySessions: [],
    ...overrides,
  }
}

describe('buildAssistantInput (the minimal data that may be sent)', () => {
  it('includes only unfinished, dated work from the semester, overdue up to 30 days back and due within 14 days', () => {
    const { request } = buildAssistantInput(
      data({
        assignments: [
          assignment('late', at(16)),
          assignment('soon', at(19, 23, 59), { estimated_minutes: 90 }),
          assignment('done', at(19), { status: 'completed' }),
          assignment('undated', null),
          assignment('far', at(18 + 15)),
          assignment('ancient', at(18 - 31)),
          assignment('other-semester', at(19), { course_id: 'old' }),
        ],
      }),
      'fall',
      NOW,
    )
    expect(request.assignments.map((a) => a.title)).toEqual(['Task late', 'Task soon'])
    expect(request.assignments[0]).toMatchObject({ ref: 'A1', overdue: true, days_until_due: -2 })
    expect(request.assignments[1]).toEqual({
      ref: 'A2',
      course: 'CS201',
      title: 'Task soon',
      due: '2026-10-19 23:59',
      days_until_due: 1,
      overdue: false,
      priority: 'medium',
      status: 'not_started',
      estimated_minutes: 90,
    })
  })

  it('leaves out personal and unneeded details', () => {
    const demo = createDemoData(NOW)
    const sent = JSON.stringify(buildAssistantInput(demo, 'demo-sem-current', NOW).request)
    for (const secret of [demo.profile.display_name, demo.profile.id, 'description', 'notes', 'location', 'instructor', 'user_id', 'grade']) {
      expect(sent).not.toContain(secret)
    }
    for (const a of demo.assignments) if (a.description) expect(sent).not.toContain(a.description)
  })

  it("lists this week's study minutes per course, including courses with none", () => {
    const sessions = [
      { course_id: 'cs', started_at: at(13, 10), duration_seconds: 3600 }, // Tue this week
      { course_id: 'cs', started_at: at(18, 8), duration_seconds: 1800 }, // today
      { course_id: null, started_at: at(14), duration_seconds: 600 }, // no course
      { course_id: 'cs', started_at: at(11), duration_seconds: 9999 }, // last week
      { course_id: 'cs', started_at: at(18, 8, 30), duration_seconds: null }, // still running
    ] as StudySession[]
    const { request } = buildAssistantInput(data({ studySessions: sessions }), 'fall', NOW)
    expect(request.study_minutes_this_week).toEqual([
      { course: 'CS201', minutes: 90 },
      { course: 'MA101', minutes: 0 },
      { course: 'Other', minutes: 10 },
    ])
  })

  it('maps refs back to the real items for display', () => {
    const exam = { id: 'x', course_id: 'ma', title: 'Midterm', exam_type: 'Midterm', starts_at: at(22) } as Exam
    const { request, items } = buildAssistantInput(data({ exams: [exam] }), 'fall', NOW)
    expect(request.exams).toEqual([{ ref: 'E1', course: 'MA101', title: 'Midterm', type: 'Midterm', starts: '2026-10-22 09:00', days_until: 4 }])
    expect(items.E1).toEqual({ kind: 'exam', title: 'Midterm', courseId: 'ma', courseCode: 'MA101', color: '#6366f1' })
  })

  it('always produces a request the server accepts, even at the limits', () => {
    const many = Array.from({ length: 40 }, (_, i) => assignment(`a${i}`, at(19), { title: 'T'.repeat(200) }))
    const exams = Array.from({ length: 20 }, (_, i) => ({ id: `e${i}`, course_id: 'cs', title: 'E', exam_type: ' ', starts_at: at(20) }) as Exam)
    const courses = Array.from({ length: 30 }, (_, i) => course(`c${i}`, `C${String(i).padStart(2, '0')}${'X'.repeat(17)}`))
    const { request } = buildAssistantInput(data({ assignments: many, exams, courses: [...courses, course('cs', 'CS201')] }), 'fall', NOW)

    expect(request.assignments).toHaveLength(ASSISTANT_LIMITS.assignments)
    expect(request.exams).toHaveLength(ASSISTANT_LIMITS.exams)
    expect(request.courses).toHaveLength(ASSISTANT_LIMITS.courses)
    expect(assistantRequestSchema.safeParse(request).error).toBeUndefined()

    const demo = createDemoData(NOW)
    expect(assistantRequestSchema.safeParse(buildAssistantInput(demo, 'demo-sem-current', NOW).request).success).toBe(true)
    expect(assistantRequestSchema.safeParse(buildAssistantInput(demo, null, NOW).request).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------

const base: AssistantRequest = {
  now: '2026-10-18 09:00',
  weekday: 'Sunday',
  courses: [{ code: 'CS201', name: 'Data Structures', credits: 3 }, { code: 'MA101', name: 'Calculus', credits: 4 }],
  assignments: [],
  exams: [],
  study_minutes_this_week: [{ course: 'CS201', minutes: 60 }, { course: 'MA101', minutes: 0 }],
}
type A = AssistantRequest['assignments'][number]
const task = (ref: string, days: number, extra: Partial<A> = {}): A => ({
  ref,
  course: 'CS201',
  title: `Task ${ref}`,
  due: `2026-10-${18 + days} 23:59`,
  days_until_due: days,
  overdue: days < 0,
  priority: 'medium',
  status: 'not_started',
  estimated_minutes: null,
  ...extra,
})

describe('buildRuleBasedPlan', () => {
  it('puts overdue work first, then what is due within two days', () => {
    const plan = buildRuleBasedPlan({ ...base, assignments: [task('A1', -1), task('A2', 1, { estimated_minutes: 90 }), task('A3', 5)] })
    expect(plan.suggestions[0]).toMatchObject({ title: 'Catch up on CS201: Task A1', priority: 'high', related: ['A1'] })
    expect(plan.suggestions[0].detail).toBe(
      'It was due yesterday at 23:59. Finish it first, or check with your lecturer whether late work is accepted.',
    )
    expect(plan.suggestions[1]).toMatchObject({ title: 'Finish CS201: Task A2', priority: 'high', related: ['A2'] })
    expect(plan.suggestions[1].detail).toBe("Due tomorrow at 23:59. You haven't started yet, so block out time today. You estimated about 1 h 30 min.")
    expect(plan.suggestions[2]).toMatchObject({ priority: 'medium', related: ['A3'] })
    expect(plan.summary).toBe('Coming up: 1 overdue, 2 due in the next 7 days.')
  })

  it('suggests spread-out revision for exams, and notices a course with no study time', () => {
    const exams = [{ ref: 'E1', course: 'MA101', title: 'Midterm', type: 'Midterm', starts: '2026-10-24 09:00', days_until: 6 }]
    const plan = buildRuleBasedPlan({ ...base, exams })
    expect(plan.suggestions[0]).toMatchObject({ title: 'Revise for MA101: Midterm', priority: 'medium', related: ['E1'] })
    expect(plan.suggestions[0].detail).toContain('Plan 5 short review sessions')
    expect(plan.suggestions[0].detail).toContain("You haven't logged study time for MA101 this week yet.")
    expect(plan.suggestions.some((s) => s.title === 'Balance your study time' && s.detail.includes('MA101'))).toBe(true)
    expect(plan.summary).toBe('Coming up: 1 exam in the next 2 weeks.')
  })

  it('groups many overdue items into one suggestion', () => {
    const plan = buildRuleBasedPlan({ ...base, assignments: [-3, -2, -1, -1, -1].map((d, i) => task(`A${i + 1}`, d)) })
    expect(plan.suggestions[0].title).toBe('Catch up on 5 overdue assignments')
    expect(plan.suggestions[0].detail).toContain('and 1 more')
    expect(plan.suggestions[0].related).toHaveLength(5)
  })

  it('says so when nothing is coming up', () => {
    const plan = buildRuleBasedPlan(base)
    expect(plan.summary).toBe('Nothing urgent coming up.')
    expect(plan.suggestions).toEqual([expect.objectContaining({ title: "You're all caught up", priority: 'low' })])
  })

  it('always fits the plan format the app displays, even with long titles and lots of work', () => {
    const long = 'L'.repeat(200)
    const busy: AssistantRequest = {
      ...base,
      assignments: Array.from({ length: 20 }, (_, i) => task(`A${i + 1}`, (i % 9) - 2, { title: long, estimated_minutes: 100_000 })),
      exams: Array.from({ length: 10 }, (_, i) => ({ ref: `E${i + 1}`, course: 'MA101', title: long, type: null, starts: '2026-10-20 09:00', days_until: i })),
    }
    const plan = buildRuleBasedPlan(busy)
    expect(studyPlanSchema.safeParse(plan).error).toBeUndefined()
    expect(plan.suggestions).toHaveLength(ASSISTANT_LIMITS.suggestions)
    // Sorted by priority.
    const order = plan.suggestions.map((s) => ({ high: 0, medium: 1, low: 2 })[s.priority])
    expect(order).toEqual([...order].sort())
  })
})
