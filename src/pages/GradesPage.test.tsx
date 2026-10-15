// @vitest-environment jsdom
/**
 * Workflow tests for Grades & GPA: assessment scores, the calculated course
 * result, final grades with the grading scale, and GPA with exclusions.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GradesPage } from '@/pages/GradesPage'
import { renderPage } from '@/test/render'
import type { Course, CourseResult, GradeEntry, GradeScaleEntry, Semester } from '@/types/database'

const db = vi.hoisted(() => ({
  semesters: [] as Semester[],
  courses: [] as Course[],
  entries: [] as GradeEntry[],
  results: [] as CourseResult[],
  scale: [] as GradeScaleEntry[],
}))

vi.mock('@/services/semesters', () => ({ listSemesters: vi.fn(async () => [...db.semesters]) }))
vi.mock('@/services/courses', () => ({ listCourses: vi.fn(async () => [...db.courses]) }))
vi.mock('@/services/grades', () => ({
  listGradeEntries: vi.fn(async () => [...db.entries]),
  listCourseResults: vi.fn(async () => [...db.results]),
  listGradeScale: vi.fn(async () => [...db.scale]),
  createGradeEntry: vi.fn(async (courseId: string, values: Partial<GradeEntry>) => {
    const row = { ...values, id: `e${db.entries.length + 1}`, course_id: courseId } as GradeEntry
    db.entries.push(row)
    return row
  }),
  updateGradeEntry: vi.fn(),
  deleteGradeEntry: vi.fn(),
  saveCourseResult: vi.fn(async (courseId: string, values: Partial<CourseResult>) => {
    db.results = [...db.results.filter((r) => r.course_id !== courseId), { ...values, id: `r-${courseId}`, course_id: courseId } as CourseResult]
    return db.results.at(-1)
  }),
  deleteCourseResult: vi.fn(),
}))

const grades = await import('@/services/grades')

const course = (id: string, code: string, credits: number) =>
  ({ id, course_code: code, course_name: `${code} course`, credits, semester_id: 'fall', color: '#6366f1' }) as Course
const entry = (id: string, course_id: string, name: string, score: number | null, max: number, weight: number | null) =>
  ({ id, course_id, assessment_name: name, score, max_score: max, weight_percent: weight }) as GradeEntry

beforeEach(() => {
  vi.clearAllMocks()
  db.semesters = [{ id: 'fall', name: 'Fall 2026', is_current: true, start_date: '2026-09-01', end_date: '2026-12-20' } as Semester]
  db.courses = [course('cs', 'CS201', 3), course('math', 'MATH210', 4)]
  db.entries = [entry('e1', 'cs', 'Quiz', 10, 10, 10), entry('e2', 'cs', 'Exam', 50, 100, 90)]
  db.results = []
  db.scale = [
    { id: 's1', grade_letter: 'A', grade_points: 4 },
    { id: 's2', grade_letter: 'A-', grade_points: 3.67 },
  ] as GradeScaleEntry[]
})

const card = async (code: string) => (await screen.findByRole('link', { name: `${code} · ${code} course` })).closest('[data-slot="card"]') as HTMLElement

describe('Grades page', () => {
  it('shows "Insufficient data" (not 0.00) when no grade is finalized, and says why', async () => {
    const { user } = renderPage(<GradesPage />)
    const semesterGpa = (await screen.findByText(/Semester GPA/)).closest('[data-slot="card"]') as HTMLElement
    expect(within(semesterGpa).getByText('Insufficient data')).toBeInTheDocument()

    await user.click(within(semesterGpa).getByText('2 courses not counted'))
    // Both courses are listed, each with its reason.
    expect(within(semesterGpa).getAllByText(': No final grade recorded', { exact: false })).toHaveLength(2)
  })

  it('calculates a weighted course result from assessment scores', async () => {
    renderPage(<GradesPage />)
    // (100% × 10 + 50% × 90) / 100 = 55%, not the simple average of 75%.
    const cs = await card('CS201')
    expect(within(cs).getByText('55%')).toBeInTheDocument()
    expect(within(cs).getByText('All assessments graded')).toBeInTheDocument()
    // A course without assessments explains instead of showing a number.
    const math = await card('MATH210')
    expect(within(math).getByText('Insufficient data')).toBeInTheDocument()
  })

  it('adds an assessment score to a course', async () => {
    const { user } = renderPage(<GradesPage />)
    await user.click(within(await card('MATH210')).getByRole('button', { name: /assessment/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Add assessment' })
    await user.type(within(dialog).getByLabelText('Assessment'), 'Midterm')
    await user.type(within(dialog).getByLabelText('Score'), '42')
    await user.type(within(dialog).getByLabelText('Out of'), '50')
    await user.type(within(dialog).getByLabelText('Weight (%)'), '30')
    expect(within(dialog).getByText('84%')).toBeInTheDocument() // live preview
    await user.click(within(dialog).getByRole('button', { name: 'Add assessment' }))

    await waitFor(() =>
      expect(grades.createGradeEntry).toHaveBeenCalledWith('math', {
        assessment_name: 'Midterm',
        score: 42,
        max_score: 50,
        weight_percent: 30,
      }),
    )
    // Shown as the course result and in the assessment table.
    expect(await within(await card('MATH210')).findAllByText('84%')).toHaveLength(2)
  })

  it('sets a final grade from the scale, and GPA uses it (weighted by credits)', async () => {
    db.results = [{ id: 'r-math', course_id: 'math', final_grade_letter: 'A', final_grade_points: 4, is_finalized: true } as CourseResult]
    const { user } = renderPage(<GradesPage />)
    await user.click(within(await card('CS201')).getByRole('button', { name: 'Set' }))

    const dialog = await screen.findByRole('dialog', { name: 'Final grade: CS201' })
    await user.type(within(dialog).getByLabelText('Letter grade'), 'A-')
    // Picking a letter in the scale fills in its points.
    expect(within(dialog).getByLabelText('Grade points')).toHaveValue('3.67')
    await user.click(within(dialog).getByRole('checkbox', { name: /official final grade/i }))
    await user.click(within(dialog).getByRole('button', { name: 'Save final grade' }))

    await waitFor(() =>
      expect(grades.saveCourseResult).toHaveBeenCalledWith('cs', {
        final_grade_letter: 'A-',
        final_grade_points: 3.67,
        is_finalized: true,
      }),
    )
    // (3.67 × 3 + 4 × 4) / 7 = 3.857… -> 3.86
    const semesterGpa = (await screen.findByText(/Semester GPA/)).closest('[data-slot="card"]') as HTMLElement
    expect(await within(semesterGpa).findByText('3.86')).toBeInTheDocument()
  })

  it('will not mark an empty grade as final', async () => {
    const { user } = renderPage(<GradesPage />)
    await user.click(within(await card('CS201')).getByRole('button', { name: 'Set' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /official final grade/i }))
    await user.click(within(dialog).getByRole('button', { name: 'Save final grade' }))
    expect(await within(dialog).findByText('Enter a grade before marking it final')).toBeInTheDocument()
    expect(grades.saveCourseResult).not.toHaveBeenCalled()
  })

  it('leaves a finalized grade without points out of GPA, and says so', async () => {
    db.results = [{ id: 'r', course_id: 'cs', final_grade_letter: 'Pass', final_grade_points: null, is_finalized: true } as CourseResult]
    const { user } = renderPage(<GradesPage />)
    const semesterGpa = (await screen.findByText(/Semester GPA/)).closest('[data-slot="card"]') as HTMLElement
    expect(within(semesterGpa).getByText('Insufficient data')).toBeInTheDocument()
    await user.click(within(semesterGpa).getByText('2 courses not counted'))
    expect(within(semesterGpa).getByText(': Grade points missing', { exact: false })).toBeInTheDocument()
  })
})
