import { BookOpen, ChevronRight, NotebookPen, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ListSkeleton, LoadError } from '@/components/AsyncStatus'
import { EmptyState } from '@/components/EmptyState'
import { ExamDialogs } from '@/components/exams/ExamDialogs'
import { ExamList } from '@/components/exams/ExamList'
import { NativeSelect } from '@/components/form/NativeSelect'
import { PageHeader } from '@/components/PageHeader'
import { RequiresAccount } from '@/components/RequiresAccount'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useExamEditor } from '@/hooks/useExamEditor'
import { useNewItemParam } from '@/hooks/useNewItemParam'
import { useNow } from '@/hooks/useNow'
import { splitExams } from '@/lib/exams'
import { listCourses } from '@/services/courses'
import { listExams } from '@/services/exams'
import { indexById } from '@/utils/format'

const TITLE = 'Exams'
const DESCRIPTION = 'Upcoming exams and assessments.'

export function ExamsPage() {
  const auth = useAuth()
  if (auth.status === 'demo') return <RequiresAccount title={TITLE} description={DESCRIPTION} />
  return <ExamsContent />
}

async function loadExamsPage() {
  const [courses, exams] = await Promise.all([listCourses(), listExams()])
  return { courses, exams }
}

function ExamsContent() {
  // Refresh every minute so "In 40 min" countdowns stay accurate.
  const now = useNow()
  const openNewOnLoad = useNewItemParam()
  const state = useAsync(loadExamsPage)
  const ready = state.status === 'ready' ? state : null
  const [courseFilter, setCourseFilter] = useState('all')

  const editor = useExamEditor({
    onChanged: () => ready?.reload(),
    initialDialog: openNewOnLoad ? { kind: 'create' } : undefined,
  })

  const courses = ready?.data.courses ?? []
  const coursesById = useMemo(() => indexById(ready?.data.courses ?? []), [ready?.data.courses])
  const { upcoming, past } = useMemo(() => {
    const exams = (ready?.data.exams ?? []).filter((e) => courseFilter === 'all' || e.course_id === courseFilter)
    return splitExams(exams, now)
  }, [ready?.data.exams, courseFilter, now])
  const hasCourses = courses.length > 0
  const hasAnyExams = (ready?.data.exams.length ?? 0) > 0

  return (
    <>
      <PageHeader
        title={TITLE}
        description={ready ? `${upcoming.length} upcoming` : DESCRIPTION}
        actions={
          hasCourses && (
            <>
              {hasAnyExams && (
                <NativeSelect
                  aria-label="Filter by course"
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-auto"
                >
                  <option value="all">All courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code}
                    </option>
                  ))}
                </NativeSelect>
              )}
              <Button onClick={() => editor.openCreate()}>
                <Plus aria-hidden /> Add exam
              </Button>
            </>
          )
        }
      />

      {state.status === 'loading' && <ListSkeleton rows={3} />}
      {state.status === 'error' && <LoadError message={state.message} onRetry={state.retry} />}

      {ready && !hasCourses && (
        <Card>
          <CardContent>
            <EmptyState icon={BookOpen} title="Add a course first" description="Every exam belongs to a course.">
              <Button asChild>
                <Link to="/courses?new=1">Add a course</Link>
              </Button>
            </EmptyState>
          </CardContent>
        </Card>
      )}

      {ready && hasCourses && (
        <div className="space-y-6">
          <section aria-labelledby="upcoming-exams">
            <h2 id="upcoming-exams" className="sr-only">
              Upcoming exams
            </h2>
            {upcoming.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={NotebookPen}
                    title={courseFilter === 'all' ? 'No upcoming exams' : 'No upcoming exams for this course'}
                    description="Add exams as soon as dates are announced, and you'll see a countdown here and on the dashboard."
                  >
                    <Button onClick={() => editor.openCreate(courseFilter === 'all' ? undefined : { courseId: courseFilter })}>
                      <Plus aria-hidden /> Add exam
                    </Button>
                  </EmptyState>
                </CardContent>
              </Card>
            ) : (
              <ExamList exams={upcoming} coursesById={coursesById} editor={editor} now={now} />
            )}
          </section>

          {past.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
                Past exams ({past.length})
              </summary>
              <div className="mt-3">
                <ExamList exams={past} coursesById={coursesById} editor={editor} now={now} />
              </div>
            </details>
          )}
        </div>
      )}

      {ready && hasCourses && <ExamDialogs editor={editor} courses={courses} />}
    </>
  )
}
