import { BookOpen } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { CourseProgress } from '@/lib/dashboard-stats'

export function CourseProgressList({ progress }: { progress: CourseProgress[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Course progress</CardTitle>
        <CardDescription>Completed assignments per course</CardDescription>
      </CardHeader>
      <CardContent>
        {progress.length === 0 ? (
          <EmptyState icon={BookOpen} title="No courses in this semester" />
        ) : (
          <ul className="space-y-4">
            {progress.map(({ course, total, completed, percent }) => (
              <li key={course.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: course.color }} aria-hidden />
                    <span className="font-medium">{course.course_code}</span>
                    <span className="truncate text-muted-foreground">{course.course_name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {percent === null ? 'No assignments yet' : `${completed} of ${total} done`}
                  </span>
                </div>
                <Progress
                  value={percent ?? 0}
                  aria-label={`${course.course_code} progress`}
                  aria-valuetext={percent === null ? 'No assignments yet' : `${percent}% complete`}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
