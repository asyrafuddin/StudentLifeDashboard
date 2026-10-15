// @vitest-environment jsdom
/** Workflow tests for the Study Tracker: timer start/stop, logging, and the 24-hour safeguard. */
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudyPage } from '@/pages/StudyPage'
import { renderPage } from '@/test/render'
import type { Course, Semester, StudySession } from '@/types/database'

const db = vi.hoisted(() => ({ semesters: [] as Semester[], courses: [] as Course[], sessions: [] as StudySession[] }))

vi.mock('@/services/semesters', () => ({ listSemesters: vi.fn(async () => [...db.semesters]) }))
vi.mock('@/services/courses', () => ({ listCourses: vi.fn(async () => [...db.courses]) }))
vi.mock('@/services/study', () => ({
  listStudySessions: vi.fn(async () => [...db.sessions]),
  startStudySession: vi.fn(async (values: Partial<StudySession>) => {
    const row = { ...values, id: 'running', started_at: new Date().toISOString(), ended_at: null, duration_seconds: null } as StudySession
    db.sessions.unshift(row)
    return row
  }),
  stopStudySession: vi.fn(async (session: StudySession) => {
    const done = { ...session, ended_at: new Date().toISOString(), duration_seconds: 1800 }
    db.sessions = db.sessions.map((s) => (s.id === session.id ? done : s))
    return done
  }),
  createStudySession: vi.fn(async (values: Partial<StudySession>) => {
    const row = { ...values, id: `log-${db.sessions.length}` } as StudySession
    db.sessions.unshift(row)
    return row
  }),
  updateStudySession: vi.fn(),
  deleteStudySession: vi.fn(),
}))

const study = await import('@/services/study')

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  db.semesters = [{ id: 'fall', name: 'Fall 2026', is_current: true } as Semester]
  db.courses = [{ id: 'cs', course_code: 'CS201', course_name: 'Data Structures', semester_id: 'fall', color: '#6366f1' } as Course]
  db.sessions = []
})

describe('Study Tracker', () => {
  it('starts a timer that is saved immediately', async () => {
    const { user } = renderPage(<StudyPage />)
    await user.selectOptions(await screen.findByLabelText('Course'), 'cs')
    await user.type(screen.getByLabelText('What are you working on?'), 'Linked lists')
    await user.click(screen.getByRole('button', { name: /start studying/i }))

    expect(study.startStudySession).toHaveBeenCalledWith({ course_id: 'cs', notes: 'Linked lists' })
    expect(await screen.findByRole('timer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stop and save/i })).toBeInTheDocument()
  })

  it('picks up a timer that was already running (e.g. after a refresh) and stops it', async () => {
    db.sessions = [{ id: 'running', course_id: 'cs', started_at: minutesAgo(30), ended_at: null, duration_seconds: null, notes: null } as StudySession]
    const { user } = renderPage(<StudyPage />)
    expect(await screen.findByRole('timer')).toHaveTextContent(/^0:(29|30):\d\d$/)

    await user.click(screen.getByRole('button', { name: /stop and save/i }))
    expect(study.stopStudySession).toHaveBeenCalledWith(expect.objectContaining({ id: 'running' }))
    // Back to the start form, and the session counts toward today.
    expect(await screen.findByRole('button', { name: /start studying/i })).toBeInTheDocument()
    const today = screen.getByText('Today').closest('[data-slot="card"]') as HTMLElement
    expect(within(today).getByText('30m')).toBeInTheDocument()
  })

  it('asks for the real duration instead of saving a timer left on for over 24 hours', async () => {
    db.sessions = [{ id: 'forgotten', course_id: null, started_at: minutesAgo(25 * 60), ended_at: null, duration_seconds: null, notes: null } as StudySession]
    const { user } = renderPage(<StudyPage />)
    expect(await screen.findByText(/running for over 24 hours/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /stop and save/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enter actual duration' }))
    const dialog = await screen.findByRole('dialog', { name: 'Enter the actual duration' })
    expect(within(dialog).getByLabelText('Minutes studied')).toHaveValue('')
  })

  it('logs a past session from a ?new=1 link', async () => {
    const { user } = renderPage(<StudyPage />, { path: '/study', url: '/study?new=1' })
    const dialog = await screen.findByRole('dialog', { name: 'Log a study session' })
    await user.selectOptions(within(dialog).getByLabelText('Course'), 'cs')
    const date = within(dialog).getByLabelText('Date')
    await user.clear(date)
    await user.type(date, '2026-10-12')
    await user.type(within(dialog).getByLabelText('Start time'), '19:00')
    await user.type(within(dialog).getByLabelText('Minutes studied'), '90')
    await user.click(within(dialog).getByRole('button', { name: 'Log session' }))

    await waitFor(() =>
      expect(study.createStudySession).toHaveBeenCalledWith({
        course_id: 'cs',
        notes: null,
        started_at: new Date(2026, 9, 12, 19, 0).toISOString(),
        ended_at: new Date(2026, 9, 12, 20, 30).toISOString(),
        duration_seconds: 5400,
      }),
    )
  })
})
