import { BookOpen, CalendarDays, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ListSkeleton, LoadError } from '@/components/AsyncStatus'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RequiresAccount } from '@/components/RequiresAccount'
import { ClashNotice } from '@/components/timetable/ClashNotice'
import { ClassSessionDialogs } from '@/components/timetable/ClassSessionDialogs'
import { DayAgenda } from '@/components/timetable/DayAgenda'
import { WeekGrid } from '@/components/timetable/WeekGrid'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useClassSessionEditor } from '@/hooks/useClassSessionEditor'
import { useNewItemParam } from '@/hooks/useNewItemParam'
import { useNow } from '@/hooks/useNow'
import { pickDefaultSemester } from '@/lib/dashboard-stats'
import { getClashMap } from '@/lib/timetable'
import { listClassSessions } from '@/services/classSessions'
import { listCourses } from '@/services/courses'
import { listSemesters } from '@/services/semesters'
import { indexById } from '@/utils/format'

const TITLE = 'Timetable'
const DESCRIPTION = 'Your weekly class schedule.'

export function TimetablePage() {
  const auth = useAuth()
  if (auth.status === 'demo') return <RequiresAccount title={TITLE} description={DESCRIPTION} />
  return <TimetableContent />
}

async function loadTimetablePage() {
  const [semesters, courses, sessions] = await Promise.all([listSemesters(), listCourses(), listClassSessions()])
  return { semesters, courses, sessions }
}

function TimetableContent() {
  const now = useNow()
  const openNewOnLoad = useNewItemParam()
  const state = useAsync(loadTimetablePage)
  const ready = state.status === 'ready' ? state : null
  const [semesterChoice, setSemesterChoice] = useState<string | null>(null)

  const editor = useClassSessionEditor({
    onChanged: () => ready?.reload(),
    initialDialog: openNewOnLoad ? { kind: 'create' } : undefined,
  })

  const semesters = ready?.data.semesters ?? []
  // Default to the current semester; fall back if the chosen one disappears.
  const semesterId =
    semesterChoice && semesters.some((s) => s.id === semesterChoice)
      ? semesterChoice
      : (pickDefaultSemester(semesters)?.id ?? '')

  // A timetable shows one semester at a time: its courses and their classes.
  const { courses, sessions, coursesById, clashMap } = useMemo(() => {
    const courses = (ready?.data.courses ?? []).filter((c) => c.semester_id === semesterId)
    const courseIds = new Set(courses.map((c) => c.id))
    const sessions = (ready?.data.sessions ?? []).filter((s) => courseIds.has(s.course_id))
    return { courses, sessions, coursesById: indexById(courses), clashMap: getClashMap(sessions) }
  }, [ready?.data, semesterId])

  return (
    <>
      <PageHeader
        title={TITLE}
        description={ready && courses.length > 0 ? `${sessions.length} classes per week` : DESCRIPTION}
        actions={
          ready &&
          semesters.length > 0 && (
            <>
              <Select value={semesterId} onValueChange={setSemesterChoice}>
                <SelectTrigger className="w-full sm:w-52" aria-label="Semester">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {courses.length > 0 && (
                <Button onClick={() => editor.openCreate()}>
                  <Plus aria-hidden /> Add class
                </Button>
              )}
            </>
          )
        }
      />

      {state.status === 'loading' && <ListSkeleton rows={4} />}
      {state.status === 'error' && <LoadError message={state.message} onRetry={state.retry} />}

      {ready && courses.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon={BookOpen}
              title={semesters.length === 0 ? 'Add a semester and courses first' : 'No courses in this semester'}
              description="Classes on your timetable belong to a course."
            >
              <Button asChild>
                <Link to="/courses?new=1">Add a course</Link>
              </Button>
            </EmptyState>
          </CardContent>
        </Card>
      )}

      {ready && courses.length > 0 && (
        <div className="space-y-4">
          <ClashNotice clashMap={clashMap} sessions={sessions} coursesById={coursesById} />

          {sessions.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={CalendarDays}
                  title="Your timetable is empty"
                  description="Add your weekly lectures, labs and tutorials. On a computer, you can also click an empty spot in the grid."
                >
                  <Button onClick={() => editor.openCreate()}>
                    <Plus aria-hidden /> Add class
                  </Button>
                </EmptyState>
              </CardContent>
            </Card>
          ) : null}

          {/* Grid on tablets and up (also when empty, so slots can be clicked); day list on phones. */}
          <div className="hidden md:block">
            <WeekGrid sessions={sessions} coursesById={coursesById} clashMap={clashMap} editor={editor} now={now} />
          </div>
          {sessions.length > 0 && (
            <div className="md:hidden">
              <DayAgenda sessions={sessions} coursesById={coursesById} clashMap={clashMap} editor={editor} now={now} />
            </div>
          )}
        </div>
      )}

      {ready && courses.length > 0 && (
        // Only this semester's classes can clash with each other.
        <ClassSessionDialogs editor={editor} courses={courses} existingSessions={sessions} />
      )}
    </>
  )
}
