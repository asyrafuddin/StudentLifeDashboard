import { format } from 'date-fns'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { CourseLabel } from '@/components/CourseLabel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDuration } from '@/lib/study'
import type { Course, StudySession } from '@/types/database'

interface StudySessionListProps {
  sessions: StudySession[]
  coursesById: Map<string, Course>
  onEdit: (session: StudySession) => void
  onDelete: (session: StudySession) => void
}

export function StudySessionList({ sessions, coursesById, onEdit, onDelete }: StudySessionListProps) {
  return (
    <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
      {sessions.map((s) => {
        const started = new Date(s.started_at)
        return (
          <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="w-16 shrink-0 text-right text-sm font-medium tabular-nums">
              {formatDuration(s.duration_seconds ?? 0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-sm">
                {s.course_id ? (
                  <CourseLabel course={coursesById.get(s.course_id)} />
                ) : (
                  <span className="text-muted-foreground">No specific course</span>
                )}
                <time dateTime={s.started_at} className="text-xs text-muted-foreground">
                  {format(started, 'EEE d MMM, h:mm a')}
                </time>
              </p>
              {s.notes && <p className="truncate text-xs text-muted-foreground">{s.notes}</p>}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for study session on ${format(started, 'EEEE d MMMM')}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(s)}>
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(s)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        )
      })}
    </ul>
  )
}
