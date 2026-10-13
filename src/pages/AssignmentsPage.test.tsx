// @vitest-environment jsdom
/**
 * Workflow tests for the Assignments page: create, validate, edit, complete,
 * delete. The database is replaced by an in-memory list, so these test the
 * page's behavior; the database's own rules are tested in supabase/tests.
 */
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssignmentsPage } from '@/pages/AssignmentsPage'
import { renderPage } from '@/test/render'
import type { Assignment, Course } from '@/types/database'

// In-memory "database" used by the mocked services below.
const db = vi.hoisted(() => ({ courses: [] as Course[], assignments: [] as Assignment[] }))

vi.mock('@/services/courses', () => ({
  listCourses: vi.fn(async () => [...db.courses]),
}))

vi.mock('@/services/assignments', () => ({
  listAssignments: vi.fn(async () => [...db.assignments]),
  createAssignment: vi.fn(async (values: Partial<Assignment>) => {
    const row = { ...baseAssignment, ...values, id: `new-${db.assignments.length}` } as Assignment
    db.assignments.push(row)
    return row
  }),
  updateAssignment: vi.fn(async (id: string, values: Partial<Assignment>) => {
    const i = db.assignments.findIndex((a) => a.id === id)
    db.assignments[i] = { ...db.assignments[i], ...values }
    return db.assignments[i]
  }),
  setAssignmentStatus: vi.fn(async (id: string, status: Assignment['status']) => {
    const a = db.assignments.find((x) => x.id === id)!
    a.status = status
    return a
  }),
  deleteAssignment: vi.fn(async (id: string) => {
    db.assignments = db.assignments.filter((a) => a.id !== id)
  }),
}))

const services = await import('@/services/assignments')

const course: Course = {
  id: 'c1',
  user_id: 'user-1',
  semester_id: 's1',
  course_code: 'CS201',
  course_name: 'Data Structures',
  instructor: null,
  credits: 3,
  color: '#6366f1',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

const baseAssignment: Assignment = {
  id: 'a1',
  user_id: 'user-1',
  course_id: 'c1',
  title: 'Problem set 4',
  description: null,
  due_at: new Date(Date.now() + 5 * 24 * 3600_000).toISOString(),
  priority: 'medium',
  status: 'not_started',
  estimated_minutes: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  db.courses = [course]
  db.assignments = [
    { ...baseAssignment },
    {
      ...baseAssignment,
      id: 'a2',
      title: 'Late lab report',
      due_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
      priority: 'high',
    },
  ]
})

describe('Assignments page', () => {
  it('lists unfinished assignments, nearest deadline first, with overdue flagged', async () => {
    renderPage(<AssignmentsPage />)
    const items = await screen.findAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Late lab report')
    expect(items[0]).toHaveTextContent('Overdue')
    expect(items[1]).toHaveTextContent('Problem set 4')
    expect(screen.getByText(/1 overdue/)).toBeInTheDocument()
  })

  it('creates an assignment and shows it after saving', async () => {
    const { user } = renderPage(<AssignmentsPage />)
    await user.click(await screen.findByRole('button', { name: /add assignment/i }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Title'), 'Essay draft')
    await user.type(within(dialog).getByLabelText('Due date'), '2026-12-01')
    await user.type(within(dialog).getByLabelText('Due time'), '09:30')
    await user.selectOptions(within(dialog).getByLabelText('Priority'), 'high')
    await user.type(within(dialog).getByLabelText('Estimate (min)'), '120')
    await user.click(within(dialog).getByRole('button', { name: 'Add assignment' }))

    await waitFor(() => expect(services.createAssignment).toHaveBeenCalledOnce())
    expect(services.createAssignment).toHaveBeenCalledWith({
      course_id: 'c1',
      title: 'Essay draft',
      description: null,
      due_at: new Date(2026, 11, 1, 9, 30).toISOString(),
      priority: 'high',
      status: 'not_started',
      estimated_minutes: 120,
    })
    expect(await screen.findByText('Essay draft')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows validation errors and does not save invalid input', async () => {
    const { user } = renderPage(<AssignmentsPage />)
    await user.click(await screen.findByRole('button', { name: /add assignment/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Estimate (min)'), '-5')
    await user.click(within(dialog).getByRole('button', { name: 'Add assignment' }))

    expect(await within(dialog).findByText('Title is required')).toBeInTheDocument()
    expect(within(dialog).getByText(/whole number of minutes/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(services.createAssignment).not.toHaveBeenCalled()
  })

  it('edits an existing assignment', async () => {
    const { user } = renderPage(<AssignmentsPage />)
    await user.click(await screen.findByRole('button', { name: 'Problem set 4' }))

    const dialog = await screen.findByRole('dialog', { name: 'Edit assignment' })
    const title = within(dialog).getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Problem set 4 (revised)')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(services.updateAssignment).toHaveBeenCalledOnce())
    expect(vi.mocked(services.updateAssignment).mock.calls[0][0]).toBe('a1')
    expect(vi.mocked(services.updateAssignment).mock.calls[0][1]).toMatchObject({ title: 'Problem set 4 (revised)' })
    expect(await screen.findByText('Problem set 4 (revised)')).toBeInTheDocument()
  })

  it('marks an assignment complete, saving the new status', async () => {
    const { user } = renderPage(<AssignmentsPage />)
    await user.click(await screen.findByRole('checkbox', { name: /mark “problem set 4” as completed/i }))

    expect(services.setAssignmentStatus).toHaveBeenCalledWith('a1', 'completed')
    // The default filter hides completed work, so it leaves the list.
    await waitFor(() => expect(screen.queryByText('Problem set 4')).not.toBeInTheDocument())
  })

  it('deletes an assignment after confirmation', async () => {
    const { user } = renderPage(<AssignmentsPage />)
    await user.click(await screen.findByRole('button', { name: /actions for “late lab report”/i }))
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }))

    const confirm = await screen.findByRole('alertdialog')
    expect(confirm).toHaveTextContent('Late lab report')
    await user.click(within(confirm).getByRole('button', { name: 'Delete assignment' }))

    expect(services.deleteAssignment).toHaveBeenCalledWith('a2')
    await waitFor(() => expect(screen.queryByText('Late lab report')).not.toBeInTheDocument())
  })

  it('filters by title search', async () => {
    const { user } = renderPage(<AssignmentsPage />)
    await screen.findByText('Late lab report')
    await user.type(screen.getByRole('searchbox', { name: /search assignments/i }), 'problem')
    expect(screen.queryByText('Late lab report')).not.toBeInTheDocument()
    expect(screen.getByText('Problem set 4')).toBeInTheDocument()
  })

  it('asks for a course first when there are none', async () => {
    db.courses = []
    db.assignments = []
    renderPage(<AssignmentsPage />)
    expect(await screen.findByText('Add a course first')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add a course' })).toHaveAttribute('href', '/courses?new=1')
  })

  it('opens the add form directly from a ?new=1 link', async () => {
    renderPage(<AssignmentsPage />, { path: '/assignments', url: '/assignments?new=1' })
    expect(await screen.findByRole('dialog', { name: 'Add assignment' })).toBeInTheDocument()
  })
})
