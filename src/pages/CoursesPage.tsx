import { BookOpen, CalendarRange, Plus, Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ListSkeleton, LoadError } from '@/components/AsyncStatus'
import { CourseCard } from '@/components/courses/CourseCard'
import { CourseDialogs } from '@/components/courses/CourseDialogs'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { RequiresAccount } from '@/components/RequiresAccount'
import { ALL_SEMESTERS, SemesterControls } from '@/components/semesters/SemesterControls'
import { type SemesterDialogState, SemesterDialogs } from '@/components/semesters/SemesterDialogs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useCourseEditor } from '@/hooks/useCourseEditor'
import { useNewItemParam } from '@/hooks/useNewItemParam'
import { searchCourses } from '@/lib/courses'
import { pickDefaultSemester } from '@/lib/dashboard-stats'
import { listAssignments } from '@/services/assignments'
import { listCourses } from '@/services/courses'
import { listSemesters } from '@/services/semesters'
import { indexById } from '@/utils/format'

const TITLE = 'My Courses'
const DESCRIPTION = 'Your courses for each semester.'

export function CoursesPage() {
  const auth = useAuth()
  if (auth.status === 'demo') return <RequiresAccount title={TITLE} description={DESCRIPTION} />
  return <CoursesContent />
}

async function loadCoursesPage() {
  const [semesters, courses, assignments] = await Promise.all([listSemesters(), listCourses(), listAssignments()])
  return { semesters, courses, assignments }
}

function CoursesContent() {
  const openNewOnLoad = useNewItemParam()
  const state = useAsync(loadCoursesPage)
  const ready = state.status === 'ready' ? state : null

  // null = "not chosen yet": show the current semester by default.
  const [semesterChoice, setSemesterChoice] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [semesterDialog, setSemesterDialog] = useState<SemesterDialogState>({ kind: 'closed' })
  const courseEditor = useCourseEditor({
    onChanged: () => ready?.reload(),
    // If there's no semester yet, this waits until one is created (see below).
    initialDialog: openNewOnLoad ? { kind: 'create' } : undefined,
  })

  const semesters = ready?.data.semesters ?? []
  const semesterIds = new Set(semesters.map((s) => s.id))
  const selectedSemesterId =
    semesterChoice && (semesterChoice === ALL_SEMESTERS || semesterIds.has(semesterChoice))
      ? semesterChoice
      : (pickDefaultSemester(semesters)?.id ?? ALL_SEMESTERS)

  const semestersById = useMemo(() => indexById(ready?.data.semesters ?? []), [ready?.data.semesters])

  const assignmentCounts = useMemo(() => {
    const counts = new Map<string, { pending: number; completed: number }>()
    for (const a of ready?.data.assignments ?? []) {
      const c = counts.get(a.course_id) ?? { pending: 0, completed: 0 }
      if (a.status === 'completed') c.completed++
      else c.pending++
      counts.set(a.course_id, c)
    }
    return counts
  }, [ready?.data.assignments])

  const allCourses = ready?.data.courses ?? []
  const semesterCourses =
    selectedSemesterId === ALL_SEMESTERS ? allCourses : allCourses.filter((c) => c.semester_id === selectedSemesterId)
  const visibleCourses = searchCourses(semesterCourses, search)

  const openAddCourse = () =>
    courseEditor.openCreate(selectedSemesterId === ALL_SEMESTERS ? undefined : selectedSemesterId)

  return (
    <>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        actions={
          semesters.length > 0 && (
            <Button onClick={openAddCourse}>
              <Plus aria-hidden /> Add course
            </Button>
          )
        }
      />

      {state.status === 'loading' && <ListSkeleton rows={3} />}
      {state.status === 'error' && <LoadError message={state.message} onRetry={state.retry} />}

      {ready && semesters.length === 0 && (
        <Card>
          <CardContent>
            <EmptyState
              icon={CalendarRange}
              title="Start by adding a semester"
              description="Courses are grouped by semester (e.g. “Fall 2026”). Add your current one, then add its courses."
            >
              <Button onClick={() => setSemesterDialog({ kind: 'create' })}>
                <Plus aria-hidden /> Add semester
              </Button>
            </EmptyState>
          </CardContent>
        </Card>
      )}

      {ready && semesters.length > 0 && (
        <div className="space-y-4">
          <SemesterControls
            semesters={semesters}
            value={selectedSemesterId}
            onValueChange={setSemesterChoice}
            onAdd={() => setSemesterDialog({ kind: 'create' })}
            onEdit={(semester) => setSemesterDialog({ kind: 'edit', semester })}
            onDelete={(semester) =>
              setSemesterDialog({
                kind: 'delete',
                semester,
                courseCount: allCourses.filter((c) => c.semester_id === semester.id).length,
              })
            }
          />

          {semesterCourses.length > 0 && (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                placeholder="Search by code, name or instructor"
                aria-label="Search courses"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 sm:max-w-sm"
              />
            </div>
          )}

          {semesterCourses.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={BookOpen}
                  title={selectedSemesterId === ALL_SEMESTERS ? 'No courses yet' : 'No courses in this semester yet'}
                  description="Add the courses you're taking to organize assignments, exams and grades."
                >
                  <Button onClick={openAddCourse}>
                    <Plus aria-hidden /> Add course
                  </Button>
                </EmptyState>
              </CardContent>
            </Card>
          ) : visibleCourses.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState icon={SearchX} title={`No courses match “${search.trim()}”`}>
                  <Button variant="outline" onClick={() => setSearch('')}>
                    Clear search
                  </Button>
                </EmptyState>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleCourses.map((course) => {
                const counts = assignmentCounts.get(course.id) ?? { pending: 0, completed: 0 }
                return (
                  <CourseCard
                    key={course.id}
                    course={course}
                    semesterName={
                      selectedSemesterId === ALL_SEMESTERS ? semestersById.get(course.semester_id)?.name : undefined
                    }
                    pendingCount={counts.pending}
                    completedCount={counts.completed}
                    editor={courseEditor}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {ready && (
        <SemesterDialogs
          state={semesterDialog}
          onClose={() => setSemesterDialog({ kind: 'closed' })}
          isFirstSemester={semesters.length === 0}
          onSaved={(semester) => {
            setSemesterDialog({ kind: 'closed' })
            setSemesterChoice(semester.id)
            ready.reload()
          }}
          onDeleted={() => {
            setSemesterDialog({ kind: 'closed' })
            setSemesterChoice(null)
            ready.reload()
          }}
        />
      )}

      {/* Course forms need at least one semester to choose from. */}
      {ready && semesters.length > 0 && (
        <CourseDialogs editor={courseEditor} semesters={semesters} existingCourseCount={allCourses.length} />
      )}
    </>
  )
}
