import { MoreHorizontal, Pencil, Trash2, User } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CourseEditor } from '@/hooks/useCourseEditor'
import type { Course } from '@/types/database'

interface CourseCardProps {
  course: Course
  /** Shown when listing courses from several semesters. */
  semesterName?: string
  pendingCount: number
  completedCount: number
  editor: CourseEditor
}

export function CourseCard({ course, semesterName, pendingCount, completedCount, editor }: CourseCardProps) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:shadow-md">
      <div className="h-1.5" style={{ backgroundColor: course.color }} aria-hidden />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{course.course_code}</p>
            <h3 className="mt-0.5 font-semibold leading-snug">
              {/* The whole card is clickable via this link's ::after overlay. */}
              <Link
                to={`/courses/${course.id}`}
                className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
              >
                {course.course_name}
              </Link>
            </h3>
          </div>
          {/* `relative` lifts the menu above the card-wide link so it stays clickable. */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="relative" aria-label={`Actions for ${course.course_code}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => editor.openEdit(course)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => editor.openDelete(course)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          {course.instructor && (
            <p className="flex items-center gap-1.5">
              <User className="size-3.5" aria-hidden />
              {course.instructor}
            </p>
          )}
          {semesterName && <p className="text-xs">{semesterName}</p>}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs">
          <Badge variant="secondary">
            {course.credits} {course.credits === 1 ? 'credit' : 'credits'}
          </Badge>
          <span className="text-muted-foreground">
            {pendingCount + completedCount === 0
              ? 'No assignments yet'
              : `${pendingCount} to do · ${completedCount} done`}
          </span>
        </div>
      </div>
    </article>
  )
}
