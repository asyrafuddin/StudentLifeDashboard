import { format } from 'date-fns'
import { CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ClassSession, Course } from '@/types/database'
import { formatTimeOfDay } from '@/utils/format'

interface TodayScheduleProps {
  sessions: ClassSession[]
  coursesById: Map<string, Course>
  now: Date
}

export function TodaySchedule({ sessions, coursesById, now }: TodayScheduleProps) {
  // "HH:MM:SS" strings compare correctly as text, so no Date parsing is needed.
  const nowTime = format(now, 'HH:mm:ss')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's classes</CardTitle>
        <CardDescription>{format(now, 'EEEE, d MMMM')}</CardDescription>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to="/timetable">Timetable</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No classes today" description="Enjoy the free time, or plan a study session." />
        ) : (
          <ol className="space-y-2">
            {sessions.map((s) => {
              const course = coursesById.get(s.course_id)
              const isNow = s.start_time <= nowTime && nowTime < s.end_time
              const isPast = s.end_time <= nowTime
              return (
                <li
                  key={s.id}
                  className={cn(
                    'flex gap-3 rounded-lg border-l-4 bg-muted/50 px-3 py-2',
                    isPast && 'opacity-60',
                  )}
                  style={{ borderLeftColor: course?.color }}
                >
                  <div className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
                    <div>{formatTimeOfDay(s.start_time)}</div>
                    <div>{formatTimeOfDay(s.end_time)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="truncate">
                        {course ? `${course.course_code} · ${course.course_name}` : 'Unknown course'}
                      </span>
                      {isNow && <Badge className="shrink-0">Now</Badge>}
                    </p>
                    {s.location && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" aria-hidden />
                        {s.location}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
