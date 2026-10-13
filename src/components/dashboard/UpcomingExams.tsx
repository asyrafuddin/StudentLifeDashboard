import { differenceInCalendarDays, format, formatDistanceStrict } from 'date-fns'
import { MapPin, NotebookPen } from 'lucide-react'
import { Link } from 'react-router'
import { CourseLabel } from '@/components/CourseLabel'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Course, Exam } from '@/types/database'

interface UpcomingExamsProps {
  exams: Exam[]
  coursesById: Map<string, Course>
  now: Date
}

export function UpcomingExams({ exams, coursesById, now }: UpcomingExamsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming exams</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to="/exams">View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {exams.length === 0 ? (
          <EmptyState icon={NotebookPen} title="No upcoming exams" description="Exams you add will appear here with a countdown." />
        ) : (
          <ul className="space-y-3">
            {exams.map((exam) => {
              const startsAt = new Date(exam.starts_at)
              const days = differenceInCalendarDays(startsAt, now)
              return (
                <li key={exam.id} className="flex items-center gap-3">
                  {/* Countdown tile: calendar days until the exam, in local time. */}
                  <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                    {days === 0 ? (
                      <span className="text-xs font-semibold">Today</span>
                    ) : (
                      <>
                        <span className="text-base leading-none font-semibold tabular-nums">{days}</span>
                        <span className="mt-0.5 text-[10px] text-muted-foreground uppercase">
                          {days === 1 ? 'day' : 'days'}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{exam.title}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <CourseLabel course={coursesById.get(exam.course_id)} />
                      <span aria-hidden>·</span>
                      <time dateTime={exam.starts_at}>{format(startsAt, 'EEE d MMM, h:mm a')}</time>
                    </p>
                    {exam.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" aria-hidden />
                        {exam.location}
                      </p>
                    )}
                  </div>
                  <span className="sr-only">Starts {formatDistanceStrict(startsAt, now, { addSuffix: true })}</span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
