import { BookOpen, ChevronRight, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ListSkeleton, LoadError } from '@/components/AsyncStatus'
import { EmptyState } from '@/components/EmptyState'
import { CourseGradesCard } from '@/components/grades/CourseGradesCard'
import { GpaSummary } from '@/components/grades/GpaSummary'
import { GradeDialogs } from '@/components/grades/GradeDialogs'
import { PageHeader } from '@/components/PageHeader'
import { RequiresAccount } from '@/components/RequiresAccount'
import { ALL_SEMESTERS } from '@/components/semesters/SemesterControls'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useGradesEditor } from '@/hooks/useGradesEditor'
import { pickDefaultSemester } from '@/lib/dashboard-stats'
import { calculateGpa } from '@/lib/gpa'
import { listCourses } from '@/services/courses'
import { listCourseResults, listGradeEntries, listGradeScale } from '@/services/grades'
import { listSemesters } from '@/services/semesters'

const TITLE = 'Grades & GPA'
const DESCRIPTION = 'Assessment scores, course results and GPA.'

export function GradesPage() {
  const auth = useAuth()
  if (auth.status === 'demo') return <RequiresAccount title={TITLE} description={DESCRIPTION} />
  return <GradesContent />
}

async function loadGradesPage() {
  const [semesters, courses, entries, results, scale] = await Promise.all([
    listSemesters(),
    listCourses(),
    listGradeEntries(),
    listCourseResults(),
    listGradeScale(),
  ])
  return { semesters, courses, entries, results, scale }
}

function GradesContent() {
  const state = useAsync(loadGradesPage)
  const ready = state.status === 'ready' ? state : null
  const [semesterChoice, setSemesterChoice] = useState<string | null>(null)
  const editor = useGradesEditor({ onChanged: () => ready?.reload() })

  const semesters = ready?.data.semesters ?? []
  const semesterId =
    semesterChoice && (semesterChoice === ALL_SEMESTERS || semesters.some((s) => s.id === semesterChoice))
      ? semesterChoice
      : (pickDefaultSemester(semesters)?.id ?? ALL_SEMESTERS)

  const view = useMemo(() => {
    if (!ready) return null
    const { courses, results } = ready.data
    const shownCourses = semesterId === ALL_SEMESTERS ? courses : courses.filter((c) => c.semester_id === semesterId)
    const semester = ready.data.semesters.find((s) => s.id === semesterId)
    return {
      shownCourses,
      semesterGpa: semester ? { name: semester.name, result: calculateGpa(shownCourses, results) } : undefined,
      cumulativeGpa: calculateGpa(courses, results),
    }
  }, [ready, semesterId])

  return (
    <>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        actions={
          semesters.length > 0 && (
            <Select value={semesterId} onValueChange={setSemesterChoice}>
              <SelectTrigger className="w-full sm:w-56" aria-label="Semester">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SEMESTERS}>All semesters</SelectItem>
                {semesters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      {state.status === 'loading' && <ListSkeleton rows={3} />}
      {state.status === 'error' && <LoadError message={state.message} onRetry={state.retry} />}

      {ready && view && ready.data.courses.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState icon={BookOpen} title="Add your courses first" description="Grades are recorded per course.">
              <Button asChild>
                <Link to="/courses?new=1">Add a course</Link>
              </Button>
            </EmptyState>
          </CardContent>
        </Card>
      )}

      {ready && view && ready.data.courses.length > 0 && (
        <div className="space-y-6">
          <GpaSummary semester={view.semesterGpa} cumulative={view.cumulativeGpa} />

          <details className="group rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium [&::-webkit-details-marker]:hidden">
              <Info className="size-4 text-muted-foreground" aria-hidden />
              How grades and GPA are calculated
              <ChevronRight className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <dl className="mt-3 space-y-2 text-muted-foreground">
              <div>
                <dt className="font-medium text-foreground">Assessment scores</dt>
                <dd>Raw marks for each quiz, assignment or exam, e.g. 42 / 50.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Course result (calculated)</dt>
                <dd>
                  The weighted average of graded assessments: sum(percentage × weight) ÷ sum(weight). Assessments without a
                  weight are left out. It's a guide only, since universities may scale or curve marks.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Final grade (official)</dt>
                <dd>The letter and grade points you enter from your transcript. Mark it final once it's official.</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">GPA</dt>
                <dd>
                  sum(grade points × credits) ÷ sum(credits), using only courses with a finalized grade that has grade
                  points. Courses left out are listed under each GPA.
                </dd>
              </div>
            </dl>
          </details>

          {ready.data.scale.length === 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                You haven't set up a grading scale. You can still type grade points directly, or{' '}
                <Link to="/settings#grading-scale" className="font-medium text-primary hover:underline">
                  set up your university's scale
                </Link>{' '}
                to pick letter grades.
              </span>
            </p>
          )}

          {view.shownCourses.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState icon={BookOpen} title="No courses in this semester" />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {view.shownCourses.map((course) => (
                <CourseGradesCard
                  key={course.id}
                  course={course}
                  entries={ready.data.entries.filter((e) => e.course_id === course.id)}
                  result={ready.data.results.find((r) => r.course_id === course.id)}
                  editor={editor}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {ready && <GradeDialogs editor={editor} results={ready.data.results} scale={ready.data.scale} />}
    </>
  )
}
