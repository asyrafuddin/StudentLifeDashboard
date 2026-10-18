// @vitest-environment jsdom
/**
 * Automated accessibility check: renders every page with sample data and runs
 * axe-core (the engine behind many accessibility checkers) over it. It finds
 * problems like inputs without labels, buttons without names, broken ARIA,
 * duplicate ids and skipped heading levels.
 *
 * Color contrast can't be measured in this simulated browser (no real
 * rendering); it was checked in a real browser instead (see docs/testing.md).
 * Automated checks catch roughly a third of issues, so the manual keyboard
 * check in docs/testing.md still matters.
 */
import { screen } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'
import { createDemoData } from '@/lib/demo-data'
import { routes as lazyRoutes } from '@/router'
import { preloadRoutes, renderRoutes, type TestAuthStatus } from '@/test/render'

const data = vi.hoisted(() => ({ current: null as ReturnType<typeof createDemoData> | null }))
const sample = () => (data.current ??= createDemoData(new Date()))

vi.mock('@/services/dashboard', () => ({ fetchDashboardData: vi.fn(async () => sample()) }))
vi.mock('@/services/semesters', () => ({ listSemesters: vi.fn(async () => sample().semesters) }))
vi.mock('@/services/courses', () => ({
  listCourses: vi.fn(async () => sample().courses),
  getCourseRelatedCounts: vi.fn(async () => ({ assignments: 0, exams: 0, classSessions: 0, gradeEntries: 0, studySessions: 0 })),
}))
vi.mock('@/services/assignments', () => ({ listAssignments: vi.fn(async () => sample().assignments) }))
vi.mock('@/services/exams', () => ({ listExams: vi.fn(async () => sample().exams) }))
vi.mock('@/services/classSessions', () => ({ listClassSessions: vi.fn(async () => sample().classSessions) }))
vi.mock('@/services/grades', () => ({
  listGradeEntries: vi.fn(async () => []),
  listCourseResults: vi.fn(async () => sample().courseResults),
  listGradeScale: vi.fn(async () => []),
}))
vi.mock('@/services/study', () => ({ listStudySessions: vi.fn(async () => sample().studySessions) }))
vi.mock('@/services/profile', () => ({ getProfile: vi.fn(async () => sample().profile) }))

async function violations(): Promise<string[]> {
  const results = await axe.run(document.body, {
    rules: {
      'color-contrast': { enabled: false }, // needs real rendering; checked in a real browser
      region: { enabled: false }, // toasts container sits outside landmarks by design
    },
  })
  return results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join('\n    ')}`,
  )
}

const PAGES: [string, string, TestAuthStatus, RegExp][] = [
  ['Sign in', '/login', 'signed_out', /^Sign in$/],
  ['Create account', '/signup', 'signed_out', /Create your account/],
  ['Reset password', '/forgot-password', 'signed_out', /Reset your password/],
  ['New password', '/update-password', 'signed_in', /Choose a new password/],
  ['Dashboard', '/', 'signed_in', /Good (morning|afternoon|evening), Demo/],
  ['My Courses', '/courses', 'signed_in', /^My Courses$/],
  ['Course detail', '/courses/demo-cs201', 'signed_in', /Data Structures/],
  ['Assignments', '/assignments', 'signed_in', /^Assignments$/],
  ['Exams', '/exams', 'signed_in', /^Exams$/],
  ['Timetable', '/timetable', 'signed_in', /^Timetable$/],
  ['Grades', '/grades', 'signed_in', /^Grades/],
  ['Study Tracker', '/study', 'signed_in', /^Study Tracker$/],
  ['Study Assistant', '/assistant', 'signed_in', /^Study Assistant$/],
  ['Settings', '/settings', 'signed_in', /^Settings$/],
  ['Demo dashboard', '/', 'demo', /Good (morning|afternoon|evening)/],
]


// Every page already loaded (see preloadRoutes).
const routes = await preloadRoutes(lazyRoutes)

describe('accessibility (axe-core)', () => {
  it.each(PAGES)('%s page has no detectable problems', async (_name, url, auth, heading) => {
    const { unmount } = renderRoutes(routes, { url, auth })
    await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 5000 })
    // Let data-driven sections finish loading too.
    await new Promise((r) => setTimeout(r, 50))
    expect(await violations()).toEqual([])
    unmount()
  })
})
