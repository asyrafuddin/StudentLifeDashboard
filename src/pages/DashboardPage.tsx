import { BookOpen, CheckCircle2, ClipboardList, GraduationCap, Loader2, NotebookPen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { CourseProgressList } from '@/components/dashboard/CourseProgressList'
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { StatCard } from '@/components/dashboard/StatCard'
import { StudyTimeChart } from '@/components/dashboard/StudyTimeChart'
import { TodaySchedule } from '@/components/dashboard/TodaySchedule'
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines'
import { UpcomingExams } from '@/components/dashboard/UpcomingExams'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { type DemoVariant, useDashboardData } from '@/hooks/useDashboardData'
import { useNow } from '@/hooks/useNow'
import {
  type DashboardData,
  getCourseProgress,
  getGreeting,
  getSummaryStats,
  getTodaysClasses,
  getUpcomingDeadlines,
  getUpcomingExams,
  getWeeklyStudyMinutes,
  pickDefaultSemester,
  scopeToSemester,
} from '@/lib/dashboard-stats'
import { calculateGpa, formatGpa } from '@/lib/gpa'
import { indexById } from '@/utils/format'

export function DashboardPage() {
  const [demoVariant, setDemoVariant] = useState<DemoVariant>('sample')
  const state = useDashboardData(demoVariant)

  return (
    <>
      {state.status === 'ready' && state.isDemo && (
        <DemoModeBanner variant={demoVariant} onVariantChange={setDemoVariant} />
      )}
      {state.status === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading your dashboard…
        </div>
      )}
      {state.status === 'error' && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-destructive">Couldn't load the dashboard: {state.message}</p>
            <Button variant="outline" size="sm" onClick={state.retry}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}
      {/* `key` resets the semester selection when switching demo datasets. */}
      {state.status === 'ready' && <DashboardContent key={demoVariant} data={state.data} />}
    </>
  )
}

function DashboardContent({ data }: { data: DashboardData }) {
  const now = useNow()
  const [semesterId, setSemesterId] = useState(() => pickDefaultSemester(data.semesters)?.id ?? '')

  // All numbers below are derived from the records — nothing is hardcoded.
  const view = useMemo(() => {
    const scope = scopeToSemester(data, semesterId)
    return {
      scope,
      coursesById: indexById(data.courses),
      stats: getSummaryStats(scope, now),
      gpa: calculateGpa(scope.courses, scope.courseResults),
      deadlines: getUpcomingDeadlines(scope.assignments, 5),
      exams: getUpcomingExams(scope.exams, now, 4),
      todaysClasses: getTodaysClasses(scope.classSessions, now),
      // Study time is about *this week*, so it isn't limited to one semester.
      studyWeek: getWeeklyStudyMinutes(data.studySessions, now),
      progress: getCourseProgress(scope.courses, scope.assignments),
    }
  }, [data, semesterId, now])

  const { stats, gpa } = view
  const firstName = data.profile.display_name.trim().split(' ')[0]

  return (
    <>
      <PageHeader
        title={firstName ? `${getGreeting(now)}, ${firstName}` : getGreeting(now)}
        description="Here's what's happening in your studies."
        actions={
          data.semesters.length > 0 && (
            <Select value={semesterId} onValueChange={setSemesterId}>
              <SelectTrigger className="w-full sm:w-60" aria-label="Semester">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent>
                {data.semesters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Courses" value={stats.courseCount} icon={BookOpen} hint="Enrolled this semester" />
        <StatCard
          label="Pending assignments"
          value={stats.pendingAssignments}
          icon={ClipboardList}
          hint={
            stats.overdueAssignments > 0 ? (
              <span className="font-medium text-destructive">{stats.overdueAssignments} overdue</span>
            ) : (
              'None overdue'
            )
          }
        />
        <StatCard label="Upcoming exams" value={stats.upcomingExams} icon={NotebookPen} hint="Scheduled from now on" />
        <StatCard label="Completed" value={stats.completedAssignments} icon={CheckCircle2} hint="Assignments done" />
        <div className="col-span-2 md:col-span-1">
          <StatCard
            label="Semester GPA"
            value={formatGpa(gpa.gpa)}
            valueIsText={gpa.gpa === null}
            icon={GraduationCap}
            hint={
              gpa.gpa === null ? (
                stats.courseCount > 0 ? 'No finalized course grades yet' : 'Add courses and final grades'
              ) : (
                <>
                  Based on {gpa.totalCredits} credits
                  {gpa.excluded.length > 0 && ` · ${gpa.excluded.length} course(s) not counted`}
                </>
              )
            }
          />
        </div>
      </section>

      <div className="mt-6">
        <h2 className="sr-only">Quick actions</h2>
        <QuickActions />
      </div>

      {stats.courseCount === 0 ? (
        <Card className="mt-6">
          <CardContent>
            <EmptyState
              icon={BookOpen}
              title="Let's set up your semester"
              description="Start by adding your courses. Assignments, exams, classes and grades are all organized by course."
            >
              <Button asChild>
                <Link to="/courses">Add your first course</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/assignments">Add an assignment</Link>
              </Button>
            </EmptyState>
          </CardContent>
        </Card>
      ) : (
        // grid-cols-1 (not the implicit auto column) lets long titles truncate instead of overflowing on mobile.
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <UpcomingDeadlines assignments={view.deadlines} coursesById={view.coursesById} now={now} />
          <TodaySchedule sessions={view.todaysClasses} coursesById={view.coursesById} now={now} />
          <StudyTimeChart days={view.studyWeek} />
          <UpcomingExams exams={view.exams} coursesById={view.coursesById} now={now} />
          <div className="lg:col-span-2">
            <CourseProgressList progress={view.progress} />
          </div>
        </div>
      )}
    </>
  )
}
