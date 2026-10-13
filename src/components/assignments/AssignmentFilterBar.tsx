import { Search, X } from 'lucide-react'
import { NativeSelect } from '@/components/form/NativeSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ASSIGNMENT_SORTS,
  type AssignmentFilters,
  type AssignmentSort,
  DEFAULT_ASSIGNMENT_FILTERS,
  DUE_FILTERS,
} from '@/lib/assignments'
import { ASSIGNMENT_PRIORITIES, ASSIGNMENT_STATUSES, type Course } from '@/types/database'
import { PRIORITY_LABELS, STATUS_LABELS } from '@/utils/format'

interface AssignmentFilterBarProps {
  filters: AssignmentFilters
  onFiltersChange: (filters: AssignmentFilters) => void
  sort: AssignmentSort
  onSortChange: (sort: AssignmentSort) => void
  /** Hide the sort control (e.g. in calendar view, where order is by date). */
  showSort: boolean
  courses: Course[]
}

export function AssignmentFilterBar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  showSort,
  courses,
}: AssignmentFilterBarProps) {
  const set = <K extends keyof AssignmentFilters>(key: K, value: AssignmentFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value })
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_ASSIGNMENT_FILTERS)

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          placeholder="Search by title"
          aria-label="Search assignments by title"
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <NativeSelect
          aria-label="Filter by course"
          value={filters.courseId}
          onChange={(e) => set('courseId', e.target.value)}
          className="sm:w-auto"
        >
          <option value="all">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Filter by status"
          value={filters.status}
          onChange={(e) => set('status', e.target.value as AssignmentFilters['status'])}
          className="sm:w-auto"
        >
          <option value="active">Not completed</option>
          <option value="all">Any status</option>
          {ASSIGNMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Filter by priority"
          value={filters.priority}
          onChange={(e) => set('priority', e.target.value as AssignmentFilters['priority'])}
          className="sm:w-auto"
        >
          <option value="all">Any priority</option>
          {ASSIGNMENT_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]} priority
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Filter by due date"
          value={filters.due}
          onChange={(e) => set('due', e.target.value as AssignmentFilters['due'])}
          className="sm:w-auto"
        >
          {Object.entries(DUE_FILTERS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>

        {showSort && (
          <NativeSelect
            aria-label="Sort assignments"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as AssignmentSort)}
            className="col-span-2 sm:col-span-1 sm:w-auto"
          >
            {Object.entries(ASSIGNMENT_SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                Sort: {label}
              </option>
            ))}
          </NativeSelect>
        )}

        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={() => onFiltersChange(DEFAULT_ASSIGNMENT_FILTERS)}>
            <X aria-hidden /> Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
