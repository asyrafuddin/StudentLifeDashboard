// @vitest-environment jsdom
/**
 * Workflow tests for the Timetable page. Note: tests don't load CSS, so both
 * the desktop grid and the phone day-list are in the page at once.
 */
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimetablePage } from '@/pages/TimetablePage'
import { renderPage } from '@/test/render'
import type { ClassSession, Course, Semester } from '@/types/database'

const db = vi.hoisted(() => ({ semesters: [] as Semester[], courses: [] as Course[], sessions: [] as ClassSession[] }))

vi.mock('@/services/semesters', () => ({ listSemesters: vi.fn(async () => [...db.semesters]) }))
vi.mock('@/services/courses', () => ({ listCourses: vi.fn(async () => [...db.courses]) }))
vi.mock('@/services/classSessions', () => ({
  listClassSessions: vi.fn(async () => [...db.sessions]),
  createClassSession: vi.fn(async (values: Partial<ClassSession>) => {
    const row = { ...values, id: `new-${db.sessions.length}`, start_time: `${values.start_time}:00`, end_time: `${values.end_time}:00` } as ClassSession
    db.sessions.push(row)
    return row
  }),
  updateClassSession: vi.fn(),
  deleteClassSession: vi.fn(),
}))

const sessionService = await import('@/services/classSessions')

const semester = (id: string, name: string, is_current: boolean) =>
  ({ id, name, is_current, start_date: '2026-09-01', end_date: '2026-12-20' }) as Semester
const course = (id: string, code: string, semester_id: string) =>
  ({ id, course_code: code, course_name: `${code} course`, semester_id, color: '#6366f1', instructor: null }) as Course
const session = (id: string, course_id: string, day: number, start: string, end: string) =>
  ({ id, course_id, day_of_week: day, start_time: `${start}:00`, end_time: `${end}:00`, location: null, instructor: null }) as ClassSession

beforeEach(() => {
  vi.clearAllMocks()
  db.semesters = [semester('fall', 'Fall 2026', true), semester('spring', 'Spring 2026', false)]
  db.courses = [course('cs', 'CS201', 'fall'), course('math', 'MATH210', 'fall'), course('old', 'HIST120', 'spring')]
  db.sessions = [
    session('s1', 'cs', 1, '09:00', '10:30'),
    session('s2', 'math', 1, '10:00', '11:00'), // overlaps s1
    session('s3', 'old', 2, '09:00', '10:00'), // previous semester
  ]
})

describe('Timetable page', () => {
  it("shows the current semester's classes and flags overlaps", async () => {
    renderPage(<TimetablePage />)
    expect(await screen.findByText('2 classes overlap')).toBeInTheDocument()
    expect(screen.getByText(/Monday: CS201 \(9:00 AM–10:30 AM\) and MATH210 \(10:00 AM–11:00 AM\)/)).toBeInTheDocument()
    // The grid labels each class, including the clash.
    expect(screen.getByRole('button', { name: /CS201 CS201 course, Monday 9:00 AM to 10:30 AM, Overlaps with MATH210/ })).toBeInTheDocument()
    // The previous semester's class isn't shown.
    expect(screen.queryByRole('button', { name: /HIST120/ })).not.toBeInTheDocument()
  })

  it('adds a class, warning (without blocking) about a clash', async () => {
    const { user } = renderPage(<TimetablePage />)
    await user.click(await screen.findByRole('button', { name: /add class/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Add class' })

    await user.selectOptions(within(dialog).getByLabelText('Course'), 'math')
    await user.selectOptions(within(dialog).getByLabelText('Day'), '1')
    await user.type(within(dialog).getByLabelText('Start time'), '09:30')
    await user.type(within(dialog).getByLabelText('End time'), '10:15')
    expect(within(dialog).getByText('This overlaps with:')).toBeInTheDocument()
    expect(within(dialog).getByText(/CS201, 9:00 AM–10:30 AM/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Add class' }))
    await waitFor(() =>
      expect(sessionService.createClassSession).toHaveBeenCalledWith({
        course_id: 'math',
        day_of_week: 1,
        start_time: '09:30',
        end_time: '10:15',
        location: null,
        instructor: null,
      }),
    )
  })

  it('rejects a class that ends before it starts', async () => {
    const { user } = renderPage(<TimetablePage />)
    await user.click(await screen.findByRole('button', { name: /add class/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Start time'), '14:00')
    await user.type(within(dialog).getByLabelText('End time'), '13:00')
    await user.click(within(dialog).getByRole('button', { name: 'Add class' }))

    expect(await within(dialog).findByText('End time must be after the start time')).toBeInTheDocument()
    expect(sessionService.createClassSession).not.toHaveBeenCalled()
  })

  it('pre-fills day and time when an empty grid slot is clicked', async () => {
    renderPage(<TimetablePage />)
    const wednesday = await screen.findByTitle('Click to add a class on Wednesday')
    // The grid starts at 8:00 and each hour is 56px tall: 2.5 hours down is 10:30.
    fireEvent.click(wednesday, { clientY: 56 * 2.5 })

    const dialog = await screen.findByRole('dialog', { name: 'Add class' })
    expect(within(dialog).getByLabelText('Day')).toHaveValue('3')
    expect(within(dialog).getByLabelText('Start time')).toHaveValue('10:30')
    expect(within(dialog).getByLabelText('End time')).toHaveValue('11:30')
  })
})
