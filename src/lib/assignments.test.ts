import { describe, expect, it } from 'vitest'
import {
  assignmentsDueOn,
  DEFAULT_ASSIGNMENT_FILTERS,
  filterAssignments,
  sortAssignments,
} from '@/lib/assignments'
import type { Assignment, AssignmentPriority, AssignmentStatus } from '@/types/database'

// Tuesday 13 October 2026, 12:00 local time. Its week ends Sunday 18 October.
const NOW = new Date(2026, 9, 13, 12, 0)

function make(
  id: string,
  opts: {
    due?: Date | null
    status?: AssignmentStatus
    priority?: AssignmentPriority
    course?: string
    created?: string
  } = {},
): Assignment {
  return {
    id,
    user_id: 'u1',
    course_id: opts.course ?? 'c1',
    title: id,
    description: null,
    due_at: opts.due === undefined || opts.due === null ? null : opts.due.toISOString(),
    priority: opts.priority ?? 'medium',
    status: opts.status ?? 'not_started',
    estimated_minutes: null,
    created_at: opts.created ?? '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z',
  }
}

const ids = (list: Assignment[]) => list.map((a) => a.id)

describe('filterAssignments', () => {
  const list = [
    make('Overdue essay', { due: new Date(2026, 9, 12, 9) }),
    make('Today lab', { due: new Date(2026, 9, 13, 18), priority: 'high' }),
    make('Friday quiz prep', { due: new Date(2026, 9, 16, 10), course: 'c2' }),
    make('Next month project', { due: new Date(2026, 10, 20) }),
    make('Someday reading', { due: null, priority: 'low' }),
    make('Finished problem set', { due: new Date(2026, 9, 10), status: 'completed' }),
  ]
  const filter = (overrides: Partial<typeof DEFAULT_ASSIGNMENT_FILTERS>) =>
    ids(filterAssignments(list, { ...DEFAULT_ASSIGNMENT_FILTERS, ...overrides }, NOW))

  it('hides completed work by default', () => {
    expect(filter({})).not.toContain('Finished problem set')
    expect(filter({})).toHaveLength(5)
  })

  it('shows everything with status "all", or only one status', () => {
    expect(filter({ status: 'all' })).toHaveLength(6)
    expect(filter({ status: 'completed' })).toEqual(['Finished problem set'])
  })

  it('searches titles case-insensitively', () => {
    expect(filter({ search: '  QUIZ ' })).toEqual(['Friday quiz prep'])
  })

  it('filters by course and priority', () => {
    expect(filter({ courseId: 'c2' })).toEqual(['Friday quiz prep'])
    expect(filter({ priority: 'high' })).toEqual(['Today lab'])
  })

  it('filters by due date windows', () => {
    expect(filter({ due: 'overdue' })).toEqual(['Overdue essay'])
    expect(filter({ due: 'today' })).toEqual(['Today lab'])
    expect(filter({ due: 'this_week' })).toEqual(['Today lab', 'Friday quiz prep'])
    expect(filter({ due: 'later' })).toEqual(['Next month project'])
    expect(filter({ due: 'none' })).toEqual(['Someday reading'])
  })

  it('never counts completed work as overdue', () => {
    expect(filter({ status: 'all', due: 'overdue' })).toEqual(['Overdue essay'])
  })
})

describe('sortAssignments', () => {
  const list = [
    make('no-date', { due: null, priority: 'high' }),
    make('later', { due: new Date(2026, 9, 20), priority: 'low', created: '2026-10-05T00:00:00Z' }),
    make('sooner', { due: new Date(2026, 9, 14), priority: 'medium', created: '2026-10-02T00:00:00Z' }),
    make('high-later', { due: new Date(2026, 9, 25), priority: 'high', created: '2026-10-09T00:00:00Z' }),
  ]

  it('sorts by nearest deadline with undated items last', () => {
    expect(ids(sortAssignments(list, 'due'))).toEqual(['sooner', 'later', 'high-later', 'no-date'])
  })

  it('sorts by priority, then by deadline', () => {
    expect(ids(sortAssignments(list, 'priority'))).toEqual(['high-later', 'no-date', 'sooner', 'later'])
  })

  it('sorts by most recently added', () => {
    expect(ids(sortAssignments(list, 'recent'))[0]).toBe('high-later')
  })

  it('does not modify the original array', () => {
    const before = ids(list)
    sortAssignments(list, 'due')
    expect(ids(list)).toEqual(before)
  })
})

describe('assignmentsDueOn', () => {
  it('matches by local calendar day', () => {
    const list = [make('morning', { due: new Date(2026, 9, 13, 0, 30) }), make('next', { due: new Date(2026, 9, 14, 0, 0) })]
    expect(ids(assignmentsDueOn(list, NOW))).toEqual(['morning'])
  })
})
