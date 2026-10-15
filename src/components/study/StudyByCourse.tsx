import { NativeSelect } from '@/components/form/NativeSelect'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDuration, sessionsInPeriod, STUDY_PERIODS, type StudyPeriod, studyTimeByCourse } from '@/lib/study'
import type { Course, StudySession } from '@/types/database'

interface StudyByCourseProps {
  sessions: StudySession[]
  coursesById: Map<string, Course>
  period: StudyPeriod
  onPeriodChange: (period: StudyPeriod) => void
  now: Date
}

/**
 * Study time per course as labeled bars. Each bar is drawn in the course's
 * color, but the course code and time are always written next to it.
 */
export function StudyByCourse({ sessions, coursesById, period, onPeriodChange, now }: StudyByCourseProps) {
  const totals = studyTimeByCourse(sessionsInPeriod(sessions, period, now))
  const max = totals[0]?.seconds ?? 0
  const sum = totals.reduce((s, t) => s + t.seconds, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time by course</CardTitle>
        <CardDescription>{sum > 0 ? `${formatDuration(sum)} total` : 'No finished sessions in this period'}</CardDescription>
        <CardAction>
          <NativeSelect
            aria-label="Period"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as StudyPeriod)}
            className="h-7 w-auto text-xs"
          >
            {Object.entries(STUDY_PERIODS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </CardAction>
      </CardHeader>
      <CardContent>
        {totals.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Finished study sessions will be summarized here.</p>
        ) : (
          <ul className="space-y-3">
            {totals.map(({ courseId, seconds }) => {
              const course = courseId ? coursesById.get(courseId) : undefined
              return (
                <li key={courseId ?? 'none'}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">
                      {course ? (
                        <>
                          <span className="font-medium">{course.course_code}</span>{' '}
                          <span className="text-muted-foreground">{course.course_name}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">{courseId ? 'Deleted course' : 'No specific course'}</span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatDuration(seconds)}{' '}
                      <span className="text-xs text-muted-foreground">({Math.round((seconds / sum) * 100)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted" aria-hidden>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(seconds / max) * 100}%`, backgroundColor: course?.color ?? 'var(--muted-foreground)' }}
                    />
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
