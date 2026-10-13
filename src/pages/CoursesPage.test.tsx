// @vitest-environment jsdom
/**
 * Workflow tests for the Courses page: semesters, adding courses, and the
 * safeguards around deleting courses and semesters.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CoursesPage } from '@/pages/CoursesPage'
import { renderPage } from '@/test/render'
import type { Course, Semester } from '@/types/database'

const db = vi.hoisted(() => ({
  semesters: [] as Semester[],
  courses: [] as Course[],
  relatedCounts: { assignments: 0, exams: 0, classSessions: 0, gradeEntries: 0, courseResults: 0, studySessions: 0 },
}))

vi.mock('@/services/semesters', () => ({
  listSemesters: vi.fn(async () => [...db.semesters]),
  createSemester: vi.fn(async (values: Partial<Semester>) => {
    const row = { ...values, id: `sem-${db.semesters.length + 1}`, user_id: 'user-1', created_at: '' } as Semester
    db.semesters.push(row)
    return row
  }),
  updateSemester: vi.fn(),
  deleteSemester: vi.fn(async (id: string) => {
    db.semesters = db.semesters.filter((s) => s.id !== id)
  }),
}))

vi.mock('@/services/courses', () => ({
  listCourses: vi.fn(async () => [...db.courses]),
  createCourse: vi.fn(async (values: Partial<Course>) => {
    const row = { ...values, id: `course-${db.courses.length + 1}`, user_id: 'user-1' } as Course
    db.courses.push(row)
    return row
  }),
  updateCourse: vi.fn(),
  deleteCourse: vi.fn(async (id: string) => {
    db.courses = db.courses.filter((c) => c.id !== id)
  }),
  getCourseRelatedCounts: vi.fn(async () => db.relatedCounts),
}))

vi.mock('@/services/assignments', () => ({ listAssignments: vi.fn(async () => []) }))

const semesterService = await import('@/services/semesters')
const courseService = await import('@/services/courses')

const fall: Semester = {
  id: 'sem-fall',
  user_id: 'user-1',
  name: 'Fall 2026',
  start_date: '2026-09-01',
  end_date: '2026-12-20',
  is_current: true,
  created_at: '',
}

const cs201: Course = {
  id: 'c1',
  user_id: 'user-1',
  semester_id: 'sem-fall',
  course_code: 'CS201',
  course_name: 'Data Structures',
  instructor: 'Dr. Rivera',
  credits: 3,
  color: '#6366f1',
  created_at: '',
  updated_at: '',
}

beforeEach(() => {
  vi.clearAllMocks()
  db.semesters = [{ ...fall }]
  db.courses = [{ ...cs201 }]
  db.relatedCounts = { assignments: 0, exams: 0, classSessions: 0, gradeEntries: 0, courseResults: 0, studySessions: 0 }
})

describe('Courses page', () => {
  it('guides a new user to add a semester, then a course', async () => {
    db.semesters = []
    db.courses = []
    const { user } = renderPage(<CoursesPage />)

    await user.click(await screen.findByRole('button', { name: 'Add semester' }))
    let dialog = await screen.findByRole('dialog', { name: 'New semester' })
    await user.type(within(dialog).getByLabelText('Name'), 'Fall 2026')
    await user.type(within(dialog).getByLabelText('Start date'), '2026-09-01')
    await user.type(within(dialog).getByLabelText('End date'), '2026-12-20')
    // The first semester is pre-marked as current.
    expect(within(dialog).getByRole('checkbox', { name: /current semester/i })).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Add semester' }))

    await waitFor(() =>
      expect(semesterService.createSemester).toHaveBeenCalledWith({
        name: 'Fall 2026',
        start_date: '2026-09-01',
        end_date: '2026-12-20',
        is_current: true,
      }),
    )

    // Now a course can be added to that semester. (The header and the empty
    // state both offer an "Add course" button; either works.)
    const [addCourse] = await screen.findAllByRole('button', { name: /add course/i })
    await user.click(addCourse)
    dialog = await screen.findByRole('dialog', { name: 'Add course' })
    await user.type(within(dialog).getByLabelText('Course code'), 'MATH210')
    await user.type(within(dialog).getByLabelText('Course name'), 'Linear Algebra')
    await user.type(within(dialog).getByLabelText('Credits'), '4')
    await user.click(within(dialog).getByRole('button', { name: 'Add course' }))

    await waitFor(() => expect(courseService.createCourse).toHaveBeenCalledOnce())
    expect(courseService.createCourse).toHaveBeenCalledWith(
      expect.objectContaining({ semester_id: 'sem-1', course_code: 'MATH210', credits: 4, instructor: null }),
    )
    expect(await screen.findByText('Linear Algebra')).toBeInTheDocument()
  })

  it('rejects a semester that ends before it starts', async () => {
    const { user } = renderPage(<CoursesPage />)
    await user.click(await screen.findByRole('button', { name: /new semester/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Bad dates')
    await user.type(within(dialog).getByLabelText('Start date'), '2027-05-01')
    await user.type(within(dialog).getByLabelText('End date'), '2027-01-01')
    await user.click(within(dialog).getByRole('button', { name: 'Add semester' }))

    expect(await within(dialog).findByText(/end date must be on or after/i)).toBeInTheDocument()
    expect(semesterService.createSemester).not.toHaveBeenCalled()
  })

  it('requires typing the course code to delete a course with linked records', async () => {
    db.relatedCounts = { ...db.relatedCounts, assignments: 3, studySessions: 2 }
    const { user } = renderPage(<CoursesPage />)

    await user.click(await screen.findByRole('button', { name: 'Actions for CS201' }))
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }))

    const confirm = await screen.findByRole('alertdialog')
    expect(await within(confirm).findByText('3 assignments')).toBeInTheDocument()
    expect(within(confirm).getByText(/2 study sessions/)).toBeInTheDocument()

    const deleteButton = within(confirm).getByRole('button', { name: 'Delete course' })
    expect(deleteButton).toBeDisabled()
    await user.type(within(confirm).getByLabelText(/type cs201 to confirm/i), 'CS201')
    expect(deleteButton).toBeEnabled()
    await user.click(deleteButton)

    expect(courseService.deleteCourse).toHaveBeenCalledWith('c1')
    await waitFor(() => expect(screen.queryByText('Data Structures')).not.toBeInTheDocument())
  })

  it('deletes a course with nothing linked after a simple confirmation', async () => {
    const { user } = renderPage(<CoursesPage />)
    await user.click(await screen.findByRole('button', { name: 'Actions for CS201' }))
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }))

    const confirm = await screen.findByRole('alertdialog')
    await within(confirm).findByText('Nothing else is linked to this course.')
    expect(within(confirm).queryByLabelText(/to confirm/i)).not.toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: 'Delete course' }))
    expect(courseService.deleteCourse).toHaveBeenCalledWith('c1')
  })

  it('explains, instead of deleting, a semester that still has courses', async () => {
    const { user } = renderPage(<CoursesPage />)
    await user.click(await screen.findByRole('button', { name: 'Actions for Fall 2026' }))
    await user.click(await screen.findByRole('menuitem', { name: /delete semester/i }))

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent("Can't delete Fall 2026 yet")
    expect(dialog).toHaveTextContent('1 course')
    expect(within(dialog).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    expect(semesterService.deleteSemester).not.toHaveBeenCalled()
  })

  it('searches courses by instructor', async () => {
    db.courses.push({ ...cs201, id: 'c2', course_code: 'ENG150', course_name: 'Academic Writing', instructor: 'Ms. Patel' })
    const { user } = renderPage(<CoursesPage />)
    await screen.findByText('Academic Writing')
    await user.type(screen.getByRole('searchbox', { name: 'Search courses' }), 'patel')
    expect(screen.queryByText('Data Structures')).not.toBeInTheDocument()
    expect(screen.getByText('Academic Writing')).toBeInTheDocument()
  })
})
