import { AlertTriangle, MapPin, MoreHorizontal, Pencil, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ClassSessionEditor } from '@/hooks/useClassSessionEditor'
import { DAYS } from '@/lib/timetable'
import type { ClassSession, Course } from '@/types/database'
import { formatTimeOfDay } from '@/utils/format'

interface ClassSessionRowProps {
  session: ClassSession
  course: Course | undefined
  editor: ClassSessionEditor
  /** Other sessions this one overlaps with. */
  clashes?: ClassSession[]
  coursesById: Map<string, Course>
  /** Show the weekday (used on the course page, where rows aren't grouped by day). */
  showDay?: boolean
}

/** One class in a list: time, course, location, instructor, clash warning and actions. */
export function ClassSessionRow({ session, course, editor, clashes = [], coursesById, showDay }: ClassSessionRowProps) {
  const day = DAYS.find((d) => d.value === session.day_of_week)
  const instructor = session.instructor ?? course?.instructor

  return (
    <li className="flex items-start gap-3 rounded-lg border-l-4 bg-muted/50 px-3 py-2" style={{ borderLeftColor: course?.color }}>
      <div className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
        {showDay && <div className="font-medium text-foreground">{day?.short}</div>}
        <div>{formatTimeOfDay(session.start_time)}</div>
        <div>{formatTimeOfDay(session.end_time)}</div>
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => editor.openEdit(session)}
          className="text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {course ? `${course.course_code} · ${course.course_name}` : 'Unknown course'}
        </button>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {session.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden />
              {session.location}
            </span>
          )}
          {instructor && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3" aria-hidden />
              {instructor}
            </span>
          )}
        </div>
        {clashes.length > 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="size-3 shrink-0" aria-hidden />
            Overlaps with {clashes.map((c) => coursesById.get(c.course_id)?.course_code ?? 'another class').join(', ')}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${course?.course_code ?? 'class'} on ${day?.long}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => editor.openEdit(session)}>
            <Pencil /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => editor.openDelete(session)}>
            <Trash2 /> Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
