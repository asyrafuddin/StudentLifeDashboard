import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  Construction,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  SearchX,
  Trash2,
} from 'lucide-react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AssignmentDialogs } from '@/components/assignments/AssignmentDialogs'
import { AssignmentList } from '@/components/assignments/AssignmentList'
import { ListSkeleton, LoadError } from '@/components/AsyncStatus'
import { CourseDialogs } from '@/components/courses/CourseDialogs'
import { EmptyState } from '@/components/EmptyState'
import { ExamDialogs } from '@/components/exams/ExamDialogs'
import { ExamList } from '@/components/exams/ExamList'
import { RequiresAccount } from '@/components/RequiresAccount'
import { ClassSessionDialogs } from '@/components/timetable/ClassSessionDialogs'
import { ClassSessionRow } from '@/components/timetable/ClassSessionRow'
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
import { useClassSessionEditor } from '@/hooks/useClassSessionEditor'
import { useCourseEditor } from '@/hooks/useCourseEditor'
import { useExamEditor } from '@/hooks/useExamEditor'
import { useNow } from '@/hooks/useNow'
import { sortAssignments } from '@/lib/assignments'
import { splitExams } from '@/lib/exams'
import { getClashMap, timeToMinutes } from '@/lib/timetable'
import { listAssignments } from '@/services/assignments'
import { listClassSessions } from '@/services/classSessions'
import { listCourses } from '@/services/courses'
import { listExams } from '@/services/exams'
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
    // All courses and classes are loaded (not just this course's) so the
    // class form can warn about clashes with other courses' classes.
    const [semesters, courses, assignments, exams, sessions] = await Promise.all([
      listSemesters(),
      listCourses(),
      listAssignments(courseId),
      listExams(courseId),
      listClassSessions(),
    ])
    return { semesters, courses, assignments, exams, sessions }
  }, [courseId])
  const state = useAsync(loader)
  const ready = state.status === 'ready' ? state : null
  const reload = () => ready?.reload()

  const courseEditor = useCourseEditor({ onChanged: reload, onDeleted: () => navigate('/courses', { replace: true }) })
  const assignmentEditor = useAssignmentEditor({
    onChanged: reload,
    onStatusChangeLocal: (id, status) =>
      ready?.mutate((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, status } : a)) })),
  })
  const examEditor = useExamEditor({ onChanged: reload })
  const classEditor = useClassSessionEditor({ onChanged: reload })

  const view = useMemo(() => {
    if (!ready) return null
    const { courses, sessions } = ready.data
    const course = courses.find((c) => c.id === courseId) ?? null
    // Clashes only matter between classes of the same semester.
    const semesterCourses = course ? courses.filter((c) => c.semester_id === course.semester_id) : []
    const semesterCourseIds = new Set(semesterCourses.map((c) => c.id))
    const semesterSessions = sessions.filter((s) => semesterCourseIds.has(s.course_id))
    return {
      course,
      coursesById: indexById(courses),
      semesterSessions,
      clashMap: getClashMap(semesterSessions),
      ownSessions: sessions
        .filter((s) => s.course_id === courseId)
        .sort((a, b) => a.day_of_week - b.day_of_week || timeToMinutes(a.start_time) - timeToMinutes(b.start_time)),
      assignments: orderForCoursePage(ready.data.assignments),
      exams: splitExams(ready.data.exams, now),
    }
  }, [ready, courseId, now])

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
      <Link to="/courses">
        <ArrowLeft aria-hidden /> My Courses
      </Link>
    </Button>
  )

  if (state.status === 'loading') return <>{backLink}<ListSkeleton rows={3} /></>
  if (state.status === 'error') return <>{backLink}<LoadError message={state.message} onRetry={state.retry} /></>
  if (!ready || !view) return null

  const { course } = view
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
  const pending = view.assignments.filter((a) => a.status !== 'completed').length
  const allExams = [...view.exams.upcoming, ...view.exams.past]

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
              {[course.instructor, `${course.credits} ${course.credits === 1 ? 'credit' : 'credits'}`, semester?.name]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="self-start">
              <MoreHorizontal aria-hidden /> Course options
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
      </header>

      <div className="space-y-8">
        <CourseSection
          id="course-assignments"
          title="Assignments"
          summary={`${pending} to do · ${view.assignments.length - pending} done`}
          addLabel="Add assignment"
          onAdd={() => assignmentEditor.openCreate({ courseId: course.id })}
        >
          {view.assignments.length === 0 ? (
            <EmptyCard icon={ClipboardList} title="No assignments for this course yet" />
          ) : (
            <AssignmentList
              assignments={view.assignments}
              coursesById={view.coursesById}
              editor={assignmentEditor}
              now={now}
              hideCourse
            />
          )}
        </CourseSection>

        <div className="grid gap-8 lg:grid-cols-2">
          <CourseSection
            id="course-exams"
            title="Exams"
            summary={`${view.exams.upcoming.length} upcoming`}
            addLabel="Add exam"
            onAdd={() => examEditor.openCreate({ courseId: course.id })}
          >
            {allExams.length === 0 ? (
              <EmptyCard icon={NotebookPen} title="No exams recorded" />
            ) : (
              <ExamList exams={allExams} coursesById={view.coursesById} editor={examEditor} now={now} hideCourse />
            )}
          </CourseSection>

          <CourseSection
            id="course-classes"
            title="Weekly classes"
            summary={`${view.ownSessions.length} per week`}
            addLabel="Add class"
            onAdd={() => classEditor.openCreate({ courseId: course.id })}
          >
            {view.ownSessions.length === 0 ? (
              <EmptyCard icon={CalendarDays} title="Not on your timetable yet" />
            ) : (
              <ul className="space-y-2">
                {view.ownSessions.map((s) => (
                  <ClassSessionRow
                    key={s.id}
                    session={s}
                    course={course}
                    editor={classEditor}
                    clashes={view.clashMap.get(s.id)}
                    coursesById={view.coursesById}
                    showDay
                  />
                ))}
              </ul>
            )}
          </CourseSection>
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="size-4 text-muted-foreground" aria-hidden />
              Grades
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Recording assessment scores and the final course grade arrives in Stage 5.
          </CardContent>
        </Card>
      </div>

      <CourseDialogs editor={courseEditor} semesters={ready.data.semesters} existingCourseCount={0} />
      <AssignmentDialogs editor={assignmentEditor} courses={[course]} />
      <ExamDialogs editor={examEditor} courses={[course]} />
      <ClassSessionDialogs editor={classEditor} courses={[course]} existingSessions={view.semesterSessions} />
    </>
  )
}

interface CourseSectionProps {
  id: string
  title: string
  summary: string
  addLabel: string
  onAdd: () => void
  children: ReactNode
}

/** A titled section of the course page with an "Add …" button. */
function CourseSection({ id, title, summary, addLabel, onAdd, children }: CourseSectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="flex items-baseline gap-2 font-semibold">
          {title}
          <span className="text-sm font-normal text-muted-foreground">{summary}</span>
        </h2>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus aria-hidden /> {addLabel}
        </Button>
      </div>
      {children}
    </section>
  )
}

function EmptyCard({ icon, title }: { icon: Parameters<typeof EmptyState>[0]['icon']; title: string }) {
  return (
    <Card>
      <CardContent>
        <EmptyState icon={icon} title={title} className="py-4" />
      </CardContent>
    </Card>
  )
}
