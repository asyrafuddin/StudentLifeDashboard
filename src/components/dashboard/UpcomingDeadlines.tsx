import { formatDistanceStrict, format } from 'date-fns'
import { ClipboardList } from 'lucide-react'
import { Link } from 'react-router'
import { CourseLabel } from '@/components/CourseLabel'
import { DeadlineBadge } from '@/components/DeadlineBadge'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDeadlineState } from '@/lib/dashboard-stats'
import type { Assignment, Course } from '@/types/database'
import { PRIORITY_LABELS } from '@/utils/format'

interface UpcomingDeadlinesProps {
  assignments: Assignment[]
  coursesById: Map<string, Course>
  now: Date
}

export function UpcomingDeadlines({ assignments, coursesById, now }: UpcomingDeadlinesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming deadlines</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to="/assignments">View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No pending deadlines"
            description="Unfinished assignments with a due date will appear here."
          />
        ) : (
          <ul className="divide-y">
            {assignments.map((a) => {
              const due = new Date(a.due_at!)
              const state = getDeadlineState(a, now)
              const relative = formatDistanceStrict(due, now, { addSuffix: true })
              return (
                <li key={a.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <CourseLabel course={coursesById.get(a.course_id)} />
                      <span aria-hidden>·</span>
                      <span>{PRIORITY_LABELS[a.priority]} priority</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <DeadlineBadge state={state} />
                    <time dateTime={a.due_at!} title={format(due, 'PPpp')} className="text-xs text-muted-foreground">
                      Due {relative}
                    </time>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
