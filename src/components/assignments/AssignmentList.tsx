import { format, formatDistanceStrict } from 'date-fns'
import { Clock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { CourseLabel } from '@/components/CourseLabel'
import { DeadlineBadge } from '@/components/DeadlineBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AssignmentEditor } from '@/hooks/useAssignmentEditor'
import { getDeadlineState } from '@/lib/dashboard-stats'
import { cn } from '@/lib/utils'
import type { Assignment, Course } from '@/types/database'
import { PRIORITY_LABELS, STATUS_LABELS, formatMinutes } from '@/utils/format'

interface AssignmentListProps {
  assignments: Assignment[]
  coursesById: Map<string, Course>
  editor: AssignmentEditor
  now: Date
  /** Hide the course label, e.g. on a course's own page. */
  hideCourse?: boolean
}

export function AssignmentList({ assignments, coursesById, editor, now, hideCourse }: AssignmentListProps) {
  return (
    <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
      {assignments.map((a) => (
        <AssignmentRow
          key={a.id}
          assignment={a}
          course={coursesById.get(a.course_id)}
          editor={editor}
          now={now}
          hideCourse={hideCourse}
        />
      ))}
    </ul>
  )
}

const PRIORITY_STYLES = {
  high: 'border-red-200 text-red-700 dark:border-red-500/30 dark:text-red-300',
  medium: 'text-muted-foreground',
  low: 'text-muted-foreground',
} as const

function AssignmentRow({
  assignment: a,
  course,
  editor,
  now,
  hideCourse,
}: {
  assignment: Assignment
  course: Course | undefined
  editor: AssignmentEditor
  now: Date
  hideCourse?: boolean
}) {
  const state = getDeadlineState(a, now)
  const done = a.status === 'completed'
  const checkboxId = `complete-${a.id}`

  return (
    <li
      className={cn(
        'flex items-start gap-3 border-l-4 border-l-transparent px-4 py-3 first:rounded-t-xl last:rounded-b-xl',
        state === 'overdue' && 'border-l-destructive bg-destructive/[0.03]',
        state === 'due_soon' && 'border-l-amber-400',
      )}
    >
      <Checkbox
        id={checkboxId}
        checked={done}
        onCheckedChange={() => editor.toggleComplete(a)}
        aria-label={done ? `Mark “${a.title}” as not completed` : `Mark “${a.title}” as completed`}
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={() => editor.openEdit(a)}
            className={cn(
              'text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none',
              done && 'text-muted-foreground line-through',
            )}
          >
            {a.title}
          </button>
          <DeadlineBadge state={state} />
          {a.status === 'in_progress' && <Badge variant="secondary">{STATUS_LABELS.in_progress}</Badge>}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {!hideCourse && <CourseLabel course={course} />}
          {a.due_at ? (
            <time dateTime={a.due_at} title={format(new Date(a.due_at), 'PPpp')}>
              Due {format(new Date(a.due_at), 'EEE d MMM, h:mm a')}
              {!done && ` (${formatDistanceStrict(new Date(a.due_at), now, { addSuffix: true })})`}
            </time>
          ) : (
            <span>No due date</span>
          )}
          <Badge variant="outline" className={PRIORITY_STYLES[a.priority]}>
            {PRIORITY_LABELS[a.priority]} priority
          </Badge>
          {a.estimated_minutes && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {formatMinutes(a.estimated_minutes)}
            </span>
          )}
        </div>
        {a.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.description}</p>}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for “${a.title}”`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => editor.openEdit(a)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => editor.openDelete(a)}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
