import { endOfWeek, isSameDay } from 'date-fns'
import { getDeadlineState } from '@/lib/dashboard-stats'
import type { Assignment, AssignmentPriority, AssignmentStatus } from '@/types/database'

/** Filters shown above the assignment list. 'all' means "don't filter". */
export interface AssignmentFilters {
  search: string
  courseId: string | 'all'
  priority: AssignmentPriority | 'all'
  /** 'active' = anything not completed. */
  status: AssignmentStatus | 'active' | 'all'
  due: DueFilter
}

export const DUE_FILTERS = {
  all: 'Any due date',
  overdue: 'Overdue',
  today: 'Due today',
  this_week: 'Due this week',
  later: 'Due after this week',
  none: 'No due date',
} as const
export type DueFilter = keyof typeof DUE_FILTERS

export const DEFAULT_ASSIGNMENT_FILTERS: AssignmentFilters = {
  search: '',
  courseId: 'all',
  priority: 'all',
  status: 'active',
  due: 'all',
}

export function filterAssignments(
  assignments: Assignment[],
  filters: AssignmentFilters,
  now: Date,
): Assignment[] {
  const search = filters.search.trim().toLowerCase()
  return assignments.filter((a) => {
    if (search && !a.title.toLowerCase().includes(search)) return false
    if (filters.courseId !== 'all' && a.course_id !== filters.courseId) return false
    if (filters.priority !== 'all' && a.priority !== filters.priority) return false
    if (filters.status === 'active' && a.status === 'completed') return false
    if (filters.status !== 'all' && filters.status !== 'active' && a.status !== filters.status) return false
    return matchesDueFilter(a, filters.due, now)
  })
}

function matchesDueFilter(a: Assignment, due: DueFilter, now: Date): boolean {
  if (due === 'all') return true
  if (due === 'none') return a.due_at === null
  if (a.due_at === null) return false
  const dueAt = new Date(a.due_at)
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  switch (due) {
    case 'overdue':
      return getDeadlineState(a, now) === 'overdue'
    case 'today':
      return isSameDay(dueAt, now)
    case 'this_week':
      return dueAt >= now && dueAt <= weekEnd
    case 'later':
      return dueAt > weekEnd
  }
}

export const ASSIGNMENT_SORTS = {
  due: 'Nearest deadline',
  priority: 'Highest priority',
  recent: 'Recently added',
} as const
export type AssignmentSort = keyof typeof ASSIGNMENT_SORTS

const PRIORITY_RANK: Record<AssignmentPriority, number> = { high: 0, medium: 1, low: 2 }

/** Earliest deadline first; assignments without a due date go last. */
function compareDue(a: Assignment, b: Assignment): number {
  if (a.due_at === null && b.due_at === null) return 0
  if (a.due_at === null) return 1
  if (b.due_at === null) return -1
  return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
}

/** Returns a new sorted array (the input is not modified). */
export function sortAssignments(assignments: Assignment[], sort: AssignmentSort): Assignment[] {
  const sorted = [...assignments]
  switch (sort) {
    case 'due':
      return sorted.sort(compareDue)
    case 'priority':
      return sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || compareDue(a, b))
    case 'recent':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
}

/** Assignments due on a given calendar day (local time). */
export function assignmentsDueOn(assignments: Assignment[], day: Date): Assignment[] {
  return assignments.filter((a) => a.due_at !== null && isSameDay(new Date(a.due_at), day))
}
