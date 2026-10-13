// @vitest-environment jsdom
/** Workflow tests for the Exams page, with the database replaced by in-memory lists. */
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExamsPage } from '@/pages/ExamsPage'
import { renderPage } from '@/test/render'
import type { Course, Exam } from '@/types/database'

const db = vi.hoisted(() => ({ courses: [] as Course[], exams: [] as Exam[] }))

vi.mock('@/services/courses', () => ({ listCourses: vi.fn(async () => [...db.courses]) }))
vi.mock('@/services/exams', () => ({
  listExams: vi.fn(async () => [...db.exams]),
  createExam: vi.fn(async (values: Partial<Exam>) => {
    const row = { ...values, id: `new-${db.exams.length}` } as Exam
    db.exams.push(row)
    return row
  }),
  updateExam: vi.fn(),
  deleteExam: vi.fn(async (id: string) => {
    db.exams = db.exams.filter((e) => e.id !== id)
  }),
}))

const examService = await import('@/services/exams')

const course = {
  id: 'c1',
  course_code: 'MATH210',
  course_name: 'Linear Algebra',
  color: '#0ea5e9',
} as Course

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 3600_000).toISOString()
const exam = (id: string, title: string, startsAt: string): Exam =>
  ({ id, course_id: 'c1', title, exam_type: null, starts_at: startsAt, location: null, notes: null }) as Exam

beforeEach(() => {
  vi.clearAllMocks()
  db.courses = [course]
  db.exams = [
    exam('later', 'Final exam', daysFromNow(30)),
    exam('soon', 'Midterm', daysFromNow(3)),
    exam('old', 'Quiz 1', daysFromNow(-10)),
  ]
})

describe('Exams page', () => {
  it('lists upcoming exams soonest first, with past exams tucked away', async () => {
    renderPage(<ExamsPage />)
    const upcoming = await screen.findByRole('region', { name: 'Upcoming exams' })
    const titles = within(upcoming).getAllByRole('button', { name: /^(Midterm|Final exam)$/ }).map((b) => b.textContent)
    expect(titles).toEqual(['Midterm', 'Final exam'])
    expect(within(upcoming).getByText('In 3 days')).toBeInTheDocument()
    expect(within(upcoming).queryByText('Quiz 1')).not.toBeInTheDocument()
    expect(screen.getByText('Past exams (1)')).toBeInTheDocument()
  })

  it('adds an exam with the entered local date and time', async () => {
    const { user } = renderPage(<ExamsPage />)
    await user.click(await screen.findByRole('button', { name: /add exam/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Add exam' })

    await user.type(within(dialog).getByLabelText('Title'), 'Final exam')
    await user.type(within(dialog).getByLabelText('Type'), 'Final')
    await user.type(within(dialog).getByLabelText('Date'), '2026-12-10')
    await user.type(within(dialog).getByLabelText('Start time'), '13:30')
    await user.type(within(dialog).getByLabelText('Location'), 'Main Hall')
    await user.click(within(dialog).getByRole('button', { name: 'Add exam' }))

    await waitFor(() =>
      expect(examService.createExam).toHaveBeenCalledWith({
        course_id: 'c1',
        title: 'Final exam',
        exam_type: 'Final',
        location: 'Main Hall',
        notes: null,
        starts_at: new Date(2026, 11, 10, 13, 30).toISOString(),
      }),
    )
  })

  it('does not invent a date or time: both are required', async () => {
    const { user } = renderPage(<ExamsPage />)
    await user.click(await screen.findByRole('button', { name: /add exam/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Date')).toHaveValue('')
    expect(within(dialog).getByLabelText('Start time')).toHaveValue('')

    await user.type(within(dialog).getByLabelText('Title'), 'Midterm')
    await user.click(within(dialog).getByRole('button', { name: 'Add exam' }))
    expect(await within(dialog).findByText('Enter a valid date')).toBeInTheDocument()
    expect(examService.createExam).not.toHaveBeenCalled()
  })

  it('deletes an exam after confirmation', async () => {
    const { user } = renderPage(<ExamsPage />)
    await user.click(await screen.findByRole('button', { name: 'Actions for “Midterm”' }))
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete exam' }))

    expect(examService.deleteExam).toHaveBeenCalledWith('soon')
    await waitFor(() => expect(screen.queryByText('Midterm')).not.toBeInTheDocument())
  })

  it('opens the add form from a ?new=1 link', async () => {
    renderPage(<ExamsPage />, { path: '/exams', url: '/exams?new=1' })
    expect(await screen.findByRole('dialog', { name: 'Add exam' })).toBeInTheDocument()
  })
})
