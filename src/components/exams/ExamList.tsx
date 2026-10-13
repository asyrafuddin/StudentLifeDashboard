import { format } from 'date-fns'
import { MapPin, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { CourseLabel } from '@/components/CourseLabel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ExamEditor } from '@/hooks/useExamEditor'
import { type ExamUrgency, getExamCountdown } from '@/lib/exams'
import { cn } from '@/lib/utils'
import type { Course, Exam } from '@/types/database'

interface ExamListProps {
  exams: Exam[]
  coursesById: Map<string, Course>
  editor: ExamEditor
  now: Date
  hideCourse?: boolean
}

const TILE_STYLES: Record<ExamUrgency, string> = {
  today: 'bg-destructive/10 text-destructive',
  this_week: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
  later: 'bg-muted text-foreground',
  past: 'bg-muted text-muted-foreground',
}

export function ExamList({ exams, coursesById, editor, now, hideCourse }: ExamListProps) {
  return (
    <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10">
      {exams.map((exam) => {
        const countdown = getExamCountdown(exam.starts_at, now)
        const startsAt = new Date(exam.starts_at)
        const [amount, unit] = countdown.short.split(' ') // "12 days" -> ["12", "days"]
        return (
          <li key={exam.id} className="flex items-start gap-3 px-4 py-3">
            {/* Countdown tile. Its words are always shown, so color is only a hint. */}
            <div
              className={cn(
                'flex size-14 shrink-0 flex-col items-center justify-center rounded-lg text-center',
                TILE_STYLES[countdown.urgency],
              )}
              aria-hidden
            >
              {unit ? (
                <>
                  <span className="text-lg leading-none font-semibold tabular-nums">{amount}</span>
                  <span className="mt-0.5 text-[10px] uppercase">{unit}</span>
                </>
              ) : (
                <span className="text-xs font-semibold">{amount}</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => editor.openEdit(exam)}
                  className={cn(
                    'text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none',
                    countdown.urgency === 'past' && 'text-muted-foreground',
                  )}
                >
                  {exam.title}
                </button>
                {exam.exam_type && <Badge variant="secondary">{exam.exam_type}</Badge>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {!hideCourse && <CourseLabel course={coursesById.get(exam.course_id)} />}
                <time dateTime={exam.starts_at}>{format(startsAt, 'EEE d MMM yyyy, h:mm a')}</time>
                <span className={cn(countdown.urgency === 'today' && 'font-medium text-destructive')}>
                  {countdown.long}
                </span>
                {exam.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3" aria-hidden />
                    {exam.location}
                  </span>
                )}
              </div>
              {exam.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{exam.notes}</p>}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for “${exam.title}”`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => editor.openEdit(exam)}>
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => editor.openDelete(exam)}>
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
