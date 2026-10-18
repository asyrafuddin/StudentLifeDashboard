import { BookOpen, CalendarDays, ClipboardList, List, Plus, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AssignmentCalendar } from '@/components/assignments/AssignmentCalendar'
import { AssignmentDialogs } from '@/components/assignments/AssignmentDialogs'
import { AssignmentFilterBar } from '@/components/assignments/AssignmentFilterBar'
import { AssignmentList } from '@/components/assignments/AssignmentList'
import { ListSkeleton, LoadError } from '@/components/AsyncStatus'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RequiresAccount } from '@/components/RequiresAccount'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAssignmentEditor } from '@/hooks/useAssignmentEditor'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useNewItemParam } from '@/hooks/useNewItemParam'
import { useNow } from '@/hooks/useNow'
import {
  type AssignmentFilters,
  type AssignmentSort,
  DEFAULT_ASSIGNMENT_FILTERS,
  filterAssignments,
  sortAssignments,
} from '@/lib/assignments'
import { getDeadlineState } from '@/lib/dashboard-stats'
import { listAssignments } from '@/services/assignments'
import { listCourses } from '@/services/courses'
import { indexById } from '@/utils/format'

const TITLE = 'Assignments'
const DESCRIPTION = 'Track coursework and deadlines.'

export function AssignmentsPage() {
  const auth = useAuth()
  if (auth.status === 'demo') return <RequiresAccount title={TITLE} description={DESCRIPTION} />
  return <AssignmentsContent />
}

async function loadAssignmentsPage() {
  const [courses, assignments] = await Promise.all([listCourses(), listAssignments()])
  return { courses, assignments }
}

function AssignmentsContent() {
  const now = useNow()
  const openNewOnLoad = useNewItemParam()
  const state = useAsync(loadAssignmentsPage)
  const [filters, setFilters] = useState<AssignmentFilters>(DEFAULT_ASSIGNMENT_FILTERS)
  const [sort, setSort] = useState<AssignmentSort>('due')
  const [view, setView] = useState<'list' | 'calendar'>('list')

  const ready = state.status === 'ready' ? state : null
  const editor = useAssignmentEditor({
    onChanged: () => ready?.reload(),
    onStatusChangeLocal: (id, status) =>
      ready?.mutate((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, status } : a)) })),
    initialDialog: openNewOnLoad ? { kind: 'create' } : undefined,
  })

  const coursesById = useMemo(() => indexById(ready?.data.courses ?? []), [ready?.data.courses])
  const visible = useMemo(() => {
    if (!ready) return []
    const filtered = filterAssignments(ready.data.assignments, filters, now)
    return sortAssignments(filtered, sort)
  }, [ready, filters, sort, now])

  const pendingCount = ready?.data.assignments.filter((a) => a.status !== 'completed').length ?? 0
  const overdueCount = ready?.data.assignments.filter((a) => getDeadlineState(a, now) === 'overdue').length ?? 0
  const hasCourses = (ready?.data.courses.length ?? 0) > 0

  return (
    <>
      <PageHeader
        title={TITLE}
        description={
          ready ? (
            <>
              {pendingCount} not completed
              {overdueCount > 0 && <span className="font-medium text-destructive"> · {overdueCount} overdue</span>}
            </>
          ) : (
            DESCRIPTION
          )
        }
        actions={
          hasCourses && (
            <>
              {/* Two toggle buttons (not tabs): the views they switch aren't tab panels. */}
              <div role="group" aria-label="View" className="inline-flex rounded-lg bg-muted p-[3px]">
                {(
                  [
                    ['list', 'List', List],
                    ['calendar', 'Calendar', CalendarDays],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <Button
                    key={value}
                    size="sm"
                    variant="ghost"
                    aria-pressed={view === value}
                    onClick={() => setView(value)}
                    className={view === value ? 'bg-background shadow-sm hover:bg-background' : 'text-muted-foreground'}
                  >
                    <Icon aria-hidden /> {label}
                  </Button>
                ))}
              </div>
              <Button onClick={() => editor.openCreate()}>
                <Plus aria-hidden /> Add assignment
              </Button>
            </>
          )
        }
      />

      {state.status === 'loading' && <ListSkeleton />}
      {state.status === 'error' && <LoadError message={state.message} onRetry={state.retry} />}

      {ready && !hasCourses && (
        <Card>
          <CardContent>
            <EmptyState
              icon={BookOpen}
              title="Add a course first"
              description="Every assignment belongs to a course, so start by adding the courses you're taking."
            >
              <Button asChild>
                <Link to="/courses?new=1">Add a course</Link>
              </Button>
            </EmptyState>
          </CardContent>
        </Card>
      )}

      {ready && hasCourses && (
        <div className="space-y-4">
          <AssignmentFilterBar
            filters={filters}
            onFiltersChange={setFilters}
            sort={sort}
            onSortChange={setSort}
            showSort={view === 'list'}
            courses={ready.data.courses}
          />

          {view === 'calendar' ? (
            <AssignmentCalendar assignments={visible} coursesById={coursesById} editor={editor} now={now} />
          ) : ready.data.assignments.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState icon={ClipboardList} title="No assignments yet" description="Add your first assignment to start tracking deadlines.">
                  <Button onClick={() => editor.openCreate()}>
                    <Plus aria-hidden /> Add assignment
                  </Button>
                </EmptyState>
              </CardContent>
            </Card>
          ) : visible.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState icon={SearchX} title="No assignments match these filters">
                  <Button variant="outline" onClick={() => setFilters(DEFAULT_ASSIGNMENT_FILTERS)}>
                    Clear filters
                  </Button>
                  {filters.status === 'active' && (
                    <Button variant="ghost" onClick={() => setFilters({ ...filters, status: 'all' })}>
                      Include completed
                    </Button>
                  )}
                </EmptyState>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                Showing {visible.length} of {ready.data.assignments.length}
              </p>
              <AssignmentList assignments={visible} coursesById={coursesById} editor={editor} now={now} />
            </>
          )}
        </div>
      )}

      {/* No courses means nothing to attach an assignment to, so no form. */}
      {ready && hasCourses && <AssignmentDialogs editor={editor} courses={ready.data.courses} />}
    </>
  )
}
