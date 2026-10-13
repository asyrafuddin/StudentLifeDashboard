import { ArrowLeft, ClipboardList, Construction, MoreHorizontal, Pencil, Plus, SearchX, Trash2 } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AssignmentDialogs } from '@/components/assignments/AssignmentDialogs'
import { AssignmentList } from '@/components/assignments/AssignmentList'
import { ListSkeleton, LoadError } from '@/components/AsyncStatus'
import { CourseDialogs } from '@/components/courses/CourseDialogs'
import { EmptyState } from '@/components/EmptyState'
import { RequiresAccount } from '@/components/RequiresAccount'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAssignmentEditor } from '@/hooks/useAssignmentEditor'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useCourseEditor } from '@/hooks/useCourseEditor'
import { useNow } from '@/hooks/useNow'
import { sortAssignments } from '@/lib/assignments'
import { listAssignments } from '@/services/assignments'
import { getCourse } from '@/services/courses'
import { listSemesters } from '@/services/semesters'
import type { Assignment } from '@/types/database'
import { indexById } from '@/utils/format'

export function CourseDetailPage() {
  const auth = useAuth()
  const { courseId = '' } = useParams()
  if (auth.status === 'demo') return <RequiresAccount title="Course" description="Course details." />
  // `key` resets all page state when moving between courses.
  return <CourseDetailContent key={courseId} courseId={courseId} />
}

/** Unfinished work first (nearest deadline on top), then completed. */
function orderForCoursePage(assignments: Assignment[]): Assignment[] {
  const sorted = sortAssignments(assignments, 'due')
  return [...sorted.filter((a) => a.status !== 'completed'), ...sorted.filter((a) => a.status === 'completed')]
}

function CourseDetailContent({ courseId }: { courseId: string }) {
  const now = useNow()
  const navigate = useNavigate()
  const loader = useCallback(async () => {
    const [course, semesters, assignments] = await Promise.all([
      getCourse(courseId),
      listSemesters(),
      listAssignments(courseId),
    ])
    return { course, semesters, assignments }
  }, [courseId])
  const state = useAsync(loader)
  const ready = state.status === 'ready' ? state : null

  const courseEditor = useCourseEditor({
    onChanged: () => ready?.reload(),
    onDeleted: () => navigate('/courses', { replace: true }),
  })
  const assignmentEditor = useAssignmentEditor({
    onChanged: () => ready?.reload(),
    onStatusChangeLocal: (id, status) =>
      ready?.mutate((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, status } : a)) })),
  })

  const course = ready?.data.course ?? null
  const coursesById = useMemo(() => indexById(course ? [course] : []), [course])
  const assignments = useMemo(() => orderForCoursePage(ready?.data.assignments ?? []), [ready?.data.assignments])

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
      <Link to="/courses">
        <ArrowLeft aria-hidden /> My Courses
      </Link>
    </Button>
  )

  if (state.status === 'loading') return <>{backLink}<ListSkeleton rows={3} /></>
  if (state.status === 'error') return <>{backLink}<LoadError message={state.message} onRetry={state.retry} /></>
  if (!ready) return null

  if (!course) {
    return (
      <>
        {backLink}
        <Card>
          <CardContent>
            <EmptyState icon={SearchX} title="Course not found" description="It may have been deleted." />
          </CardContent>
        </Card>
      </>
    )
  }

  const semester = ready.data.semesters.find((s) => s.id === course.semester_id)
  const pending = assignments.filter((a) => a.status !== 'completed').length

  return (
    <>
      {backLink}

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: course.color }} aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{course.course_code}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{course.course_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {[
                course.instructor,
                `${course.credits} ${course.credits === 1 ? 'credit' : 'credits'}`,
                semester?.name,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => assignmentEditor.openCreate(course.id)}>
            <Plus aria-hidden /> Add assignment
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Course actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => courseEditor.openEdit(course)}>
                <Pencil /> Edit course
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => courseEditor.openDelete(course)}>
                <Trash2 /> Delete course
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <section aria-labelledby="course-assignments" className="space-y-3">
        <h2 id="course-assignments" className="flex items-baseline gap-2 font-semibold">
          Assignments
          <span className="text-sm font-normal text-muted-foreground">
            {pending} to do · {assignments.length - pending} done
          </span>
        </h2>
        {assignments.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState icon={ClipboardList} title="No assignments for this course yet">
                <Button variant="outline" onClick={() => assignmentEditor.openCreate(course.id)}>
                  <Plus aria-hidden /> Add assignment
                </Button>
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <AssignmentList
            assignments={assignments}
            coursesById={coursesById}
            editor={assignmentEditor}
            now={now}
            hideCourse
          />
        )}
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <ComingLater title="Exams" stage={4} text="Record this course's exams and see countdowns." />
        <ComingLater title="Weekly classes" stage={4} text="Add class times to your weekly timetable." />
        <ComingLater title="Grades" stage={5} text="Record assessment scores and the final course grade." />
      </div>

      <CourseDialogs editor={courseEditor} semesters={ready.data.semesters} existingCourseCount={0} />
      <AssignmentDialogs editor={assignmentEditor} courses={[course]} />
    </>
  )
}

function ComingLater({ title, stage, text }: { title: string; stage: number; text: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Construction className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {text} <span className="whitespace-nowrap">(Stage {stage})</span>
      </CardContent>
    </Card>
  )
}
