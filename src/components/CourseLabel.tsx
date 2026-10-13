import type { Course } from '@/types/database'
import { cn } from '@/lib/utils'

/**
 * A course's color dot + code. The text is always shown, so the color is a
 * visual aid rather than the only way to identify the course.
 */
export function CourseLabel({ course, className }: { course: Course | undefined; className?: string }) {
  if (!course) return <span className={cn('text-muted-foreground', className)}>Unknown course</span>
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={course.course_name}>
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: course.color }} aria-hidden />
      {course.course_code}
    </span>
  )
}
