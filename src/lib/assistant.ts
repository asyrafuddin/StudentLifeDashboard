import { differenceInCalendarDays, format, startOfWeek } from 'date-fns'
import {
  ASSISTANT_LIMITS,
  type AssistantRequest,
  type StudyPlan,
  type StudySuggestion,
} from '@shared/study-assistant-contract'
import { type DashboardData, scopeToSemester } from '@/lib/dashboard-stats'
import { indexById } from '@/utils/format'

/**
 * The study assistant's logic, all pure functions:
 *  - `buildAssistantInput` turns the student's records into the small summary
 *    that may be sent to the AI (the "minimal data").
 *  - `buildRuleBasedPlan` makes a plan from that same summary with simple
 *    rules, so the page is useful without any AI at all.
 */

/** How far ahead (and back, for overdue work) the assistant looks. */
export const LOOK_AHEAD_DAYS = { assignments: 14, exams: 30, overdue: 30 } as const

/** Display details for an item a suggestion points at (by its ref, e.g. "A1"). */
export interface AssistantItem {
  kind: 'assignment' | 'exam'
  title: string
  courseId: string
  courseCode: string
  color: string
}

export interface AssistantInput {
  /** Exactly what would be sent to the AI. */
  request: AssistantRequest
  /** Ref -> details, so the app can show suggestions with real titles and links. */
  items: Record<string, AssistantItem>
}

const localTime = (date: Date) => format(date, 'yyyy-MM-dd HH:mm')
/** Keeps text within the contract's limits (the database allows the same lengths). */
const fit = (text: string, max: number) => text.trim().slice(0, max)

export function buildAssistantInput(data: DashboardData, semesterId: string | null, now: Date): AssistantInput {
  const scope = semesterId
    ? scopeToSemester(data, semesterId)
    : { courses: [], assignments: [], exams: [], classSessions: [], courseResults: [] }
  const coursesById = indexById(data.courses)
  const codeOf = (courseId: string | null) => {
    const course = courseId ? coursesById.get(courseId) : undefined
    return course ? fit(course.course_code, 20) : 'Other'
  }
  const items: Record<string, AssistantItem> = {}
  const remember = (ref: string, kind: AssistantItem['kind'], title: string, courseId: string) => {
    const course = coursesById.get(courseId)
    items[ref] = { kind, title, courseId, courseCode: codeOf(courseId), color: course?.color ?? '#94a3b8' }
  }

  const courses = [...scope.courses]
    .sort((a, b) => a.course_code.localeCompare(b.course_code))
    .slice(0, ASSISTANT_LIMITS.courses)
    .map((c) => ({ code: fit(c.course_code, 20), name: fit(c.course_name, 150), credits: Number(c.credits) }))

  // Unfinished work with a due date: overdue (up to a month back) or due within two weeks.
  const assignments = scope.assignments
    .filter((a) => a.status !== 'completed' && a.due_at !== null)
    .map((a) => ({ a, due: new Date(a.due_at!), days: differenceInCalendarDays(new Date(a.due_at!), now) }))
    .filter(({ days }) => days >= -LOOK_AHEAD_DAYS.overdue && days <= LOOK_AHEAD_DAYS.assignments)
    .sort((x, y) => x.due.getTime() - y.due.getTime())
    .slice(0, ASSISTANT_LIMITS.assignments)
    .map(({ a, due, days }, i) => {
      const ref = `A${i + 1}`
      remember(ref, 'assignment', a.title, a.course_id)
      return {
        ref,
        course: codeOf(a.course_id),
        title: fit(a.title, 200),
        due: localTime(due),
        days_until_due: days,
        overdue: due < now,
        priority: a.priority,
        status: a.status as 'not_started' | 'in_progress',
        estimated_minutes: a.estimated_minutes,
      }
    })

  const exams = scope.exams
    .map((e) => ({ e, start: new Date(e.starts_at) }))
    .filter(({ start }) => start >= now && differenceInCalendarDays(start, now) <= LOOK_AHEAD_DAYS.exams)
    .sort((x, y) => x.start.getTime() - y.start.getTime())
    .slice(0, ASSISTANT_LIMITS.exams)
    .map(({ e, start }, i) => {
      const ref = `E${i + 1}`
      remember(ref, 'exam', e.title, e.course_id)
      return {
        ref,
        course: codeOf(e.course_id),
        title: fit(e.title, 200),
        type: e.exam_type?.trim() ? fit(e.exam_type, 50) : null,
        starts: localTime(start),
        days_until: differenceInCalendarDays(start, now),
      }
    })

  // Finished study time this week (Monday to now), per course. Every course in
  // the semester is listed, even at 0 minutes, so neglected ones stand out.
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const minutes = new Map<string, number>(courses.map((c) => [c.code, 0]))
  for (const s of data.studySessions) {
    const started = new Date(s.started_at)
    if (s.duration_seconds === null || started < weekStart || started > now) continue
    const code = codeOf(s.course_id)
    minutes.set(code, (minutes.get(code) ?? 0) + s.duration_seconds / 60)
  }
  const study_minutes_this_week = [...minutes]
    .slice(0, ASSISTANT_LIMITS.courses + 1)
    .map(([course, total]) => ({ course, minutes: Math.min(Math.round(total), 10_080) }))

  return {
    request: {
      now: localTime(now),
      weekday: format(now, 'EEEE') as AssistantRequest['weekday'],
      courses,
      assignments,
      exams,
      study_minutes_this_week,
    },
    items,
  }
}

// ---------------------------------------------------------------------------
// Rule-based plan
// ---------------------------------------------------------------------------

type InputAssignment = AssistantRequest['assignments'][number]

function whenDays(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days === -1) return 'yesterday'
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}

const timeOf = (localDateTime: string) => localDateTime.slice(11)
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`)
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

function listAssignments(list: InputAssignment[]): string {
  const shown = list.slice(0, 4).map((a) => `${a.course} ${a.title}`)
  const more = list.length - shown.length
  return shown.join('; ') + (more > 0 ? `; and ${more} more` : '')
}

function suggestion(title: string, detail: string, priority: StudySuggestion['priority'], related: string[]): StudySuggestion {
  return { title: clip(title, 120), detail: clip(detail, 600), priority, related: related.slice(0, 5) }
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const

/**
 * Simple, predictable rules that cover the basics: overdue work first, then
 * what's due in the next two days, upcoming exams, the rest of the week, and
 * courses with work coming up but no study time logged this week.
 */
export function buildRuleBasedPlan(input: AssistantRequest): StudyPlan {
  const overdue = input.assignments.filter((a) => a.overdue)
  const dueSoon = input.assignments.filter((a) => !a.overdue && a.days_until_due <= 2)
  const dueThisWeek = input.assignments.filter((a) => !a.overdue && a.days_until_due > 2 && a.days_until_due <= 7)
  const examsSoon = input.exams.filter((e) => e.days_until <= 14)
  const studied = new Map(input.study_minutes_this_week.map((s) => [s.course, s.minutes]))
  const suggestions: StudySuggestion[] = []

  const lateWork = 'or check with your lecturer whether late work is accepted.'
  if (overdue.length === 1) {
    const [a] = overdue
    suggestions.push(
      suggestion(
        `Catch up on ${a.course}: ${a.title}`,
        `It was due ${whenDays(a.days_until_due)} at ${timeOf(a.due)}. Finish it first, ${lateWork}`,
        'high',
        [a.ref],
      ),
    )
  } else if (overdue.length > 1) {
    suggestions.push(
      suggestion(
        `Catch up on ${overdue.length} overdue assignments`,
        `${listAssignments(overdue)}. Finish these first, ${lateWork}`,
        'high',
        overdue.map((a) => a.ref),
      ),
    )
  }

  for (const a of dueSoon.slice(0, 3)) {
    const started = a.status === 'in_progress' ? "You've started, so keep the momentum." : "You haven't started yet, so block out time today."
    const estimate = a.estimated_minutes ? ` You estimated about ${formatMinutes(a.estimated_minutes)}.` : ''
    suggestions.push(
      suggestion(
        `Finish ${a.course}: ${a.title}`,
        `Due ${whenDays(a.days_until_due)} at ${timeOf(a.due)}. ${started}${estimate}`,
        'high',
        [a.ref],
      ),
    )
  }

  for (const e of examsSoon.slice(0, 3)) {
    const plan =
      e.days_until <= 2
        ? 'Go over key topics and past questions, and get a good night’s sleep.'
        : `Plan ${Math.min(e.days_until, 5)} short review sessions (45–60 min) before then, rather than one long one.`
    const noStudy = (studied.get(e.course) ?? 0) === 0 ? ` You haven't logged study time for ${e.course} this week yet.` : ''
    suggestions.push(
      suggestion(
        `Revise for ${e.course}: ${e.title}`,
        `${capitalize(whenDays(e.days_until))} at ${timeOf(e.starts)}. ${plan}${noStudy}`,
        e.days_until <= 3 ? 'high' : e.days_until <= 7 ? 'medium' : 'low',
        [e.ref],
      ),
    )
  }

  if (dueThisWeek.length > 0) {
    const estimated = dueThisWeek.reduce((sum, a) => sum + (a.estimated_minutes ?? 0), 0)
    suggestions.push(
      suggestion(
        "Start early on the rest of this week's work",
        `${listAssignments(dueThisWeek)}. Starting now leaves room for surprises. Break each one into small steps.` +
          (estimated > 0 ? ` Your estimates add up to about ${formatMinutes(estimated)}.` : ''),
        'medium',
        dueThisWeek.map((a) => a.ref),
      ),
    )
  }

  // Courses with something due within a week (or an exam within two) but no study time this week.
  const busy = new Set([...dueSoon, ...dueThisWeek].map((a) => a.course).concat(examsSoon.map((e) => e.course)))
  const neglected = [...busy].filter((code) => code !== 'Other' && (studied.get(code) ?? 0) === 0)
  if (neglected.length > 0) {
    suggestions.push(
      suggestion(
        'Balance your study time',
        `No study time logged this week for ${neglected.join(', ')}, which ${neglected.length === 1 ? 'has' : 'have'} work coming up. Even one 30-minute session helps.`,
        'medium',
        [],
      ),
    )
  }

  if (suggestions.length === 0) {
    suggestions.push(
      suggestion(
        "You're all caught up",
        'Nothing is due in the next week. A good time to review recent lecture notes or get ahead on later work.',
        'low',
        [],
      ),
    )
  }

  const parts = [
    overdue.length > 0 && `${overdue.length} overdue`,
    dueSoon.length + dueThisWeek.length > 0 && `${dueSoon.length + dueThisWeek.length} due in the next 7 days`,
    examsSoon.length > 0 && plural(examsSoon.length, 'exam') + ' in the next 2 weeks',
  ].filter(Boolean)

  return {
    summary: parts.length > 0 ? `Coming up: ${parts.join(', ')}.` : 'Nothing urgent coming up.',
    suggestions: suggestions
      .map((s, i) => ({ s, i }))
      .sort((x, y) => PRIORITY_ORDER[x.s.priority] - PRIORITY_ORDER[y.s.priority] || x.i - y.i)
      .slice(0, ASSISTANT_LIMITS.suggestions)
      .map(({ s }) => s),
  }
}
