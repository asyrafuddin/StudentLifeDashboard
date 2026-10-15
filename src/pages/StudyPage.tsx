import { CalendarDays, Clock, ListChecks, Plus, Timer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ListSkeleton, LoadError } from '@/components/AsyncStatus'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { StatCard } from '@/components/dashboard/StatCard'
import { StudyTimeChart } from '@/components/dashboard/StudyTimeChart'
import { EmptyState } from '@/components/EmptyState'
import { FormDialog } from '@/components/form/FormDialog'
import { PageHeader } from '@/components/PageHeader'
import { RequiresAccount } from '@/components/RequiresAccount'
import { StudyByCourse } from '@/components/study/StudyByCourse'
import { StudyLogForm } from '@/components/study/StudyLogForm'
import { StudySessionList } from '@/components/study/StudySessionList'
import { StudyTimerCard } from '@/components/study/StudyTimerCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import { useNewItemParam } from '@/hooks/useNewItemParam'
import { useNow } from '@/hooks/useNow'
import { useRecordDialogs } from '@/hooks/useRecordDialogs'
import { getWeeklyStudyMinutes } from '@/lib/dashboard-stats'
import { findRunningSession, formatDuration, type StudyPeriod, summarizeStudy } from '@/lib/study'
import { listCourses } from '@/services/courses'
import { listSemesters } from '@/services/semesters'
import { deleteStudySession, listStudySessions } from '@/services/study'
import type { StudySession } from '@/types/database'
import { indexById } from '@/utils/format'

const TITLE = 'Study Tracker'
const DESCRIPTION = 'Record and review your study time.'
const RECENT_LIMIT = 15

export function StudyPage() {
  const auth = useAuth()
  if (auth.status === 'demo') return <RequiresAccount title={TITLE} description={DESCRIPTION} />
  return <StudyContent />
}

async function loadStudyPage() {
  const [semesters, courses, sessions] = await Promise.all([listSemesters(), listCourses(), listStudySessions()])
  return { semesters, courses, sessions }
}

function StudyContent() {
  const now = useNow()
  const openNewOnLoad = useNewItemParam()
  const state = useAsync(loadStudyPage)
  const ready = state.status === 'ready' ? state : null
  const [period, setPeriod] = useState<StudyPeriod>('week')
  const [showAll, setShowAll] = useState(false)

  const dialogs = useRecordDialogs<StudySession>({
    onChanged: () => ready?.reload(),
    remove: (s) => deleteStudySession(s.id),
    deletedMessage: () => 'Study session deleted',
    initialDialog: openNewOnLoad ? { kind: 'create' } : undefined,
  })

  const view = useMemo(() => {
    if (!ready) return null
    const { sessions, courses } = ready.data
    return {
      coursesById: indexById(courses),
      running: findRunningSession(sessions),
      finished: sessions.filter((s) => s.duration_seconds !== null), // already newest first
      summary: summarizeStudy(sessions, now),
      week: getWeeklyStudyMinutes(sessions, now),
    }
  }, [ready, now])

  const formOpen = dialogs.dialog.kind === 'create' || dialogs.dialog.kind === 'edit'
  const editingRunning = dialogs.dialog.kind === 'edit' && dialogs.dialog.item.ended_at === null

  return (
    <>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        actions={
          ready && (
            <Button variant="outline" onClick={() => dialogs.openCreate()}>
              <Plus aria-hidden /> Log a past session
            </Button>
          )
        }
      />

      {state.status === 'loading' && <ListSkeleton rows={3} />}
      {state.status === 'error' && <LoadError message={state.message} onRetry={state.retry} />}

      {ready && view && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <StudyTimerCard
              running={view.running}
              courses={ready.data.courses}
              semesters={ready.data.semesters}
              onChanged={ready.reload}
              onFixTooLong={dialogs.openEdit}
            />
            <div className="grid grid-cols-2 content-start gap-3">
              <StatCard label="Today" value={formatDuration(view.summary.todaySeconds)} icon={Clock} hint="Finished sessions" />
              <StatCard label="This week" value={formatDuration(view.summary.weekSeconds)} icon={CalendarDays} hint="Since Monday" />
              <div className="col-span-2">
                <StatCard
                  label="Sessions this week"
                  value={view.summary.weekSessionCount}
                  icon={ListChecks}
                  hint={
                    view.summary.weekSessionCount > 0
                      ? `About ${formatDuration(view.summary.weekSeconds / view.summary.weekSessionCount)} each`
                      : 'Start the timer or log a past session'
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <StudyTimeChart days={view.week} />
            <StudyByCourse
              sessions={ready.data.sessions}
              coursesById={view.coursesById}
              period={period}
              onPeriodChange={setPeriod}
              now={now}
            />
          </div>

          <section aria-labelledby="recent-sessions" className="space-y-3">
            <h2 id="recent-sessions" className="font-semibold">
              Recent sessions
            </h2>
            {view.finished.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={Timer}
                    title="No study sessions yet"
                    description="Use the timer while you study, or log a session you've already done."
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                <StudySessionList
                  sessions={showAll ? view.finished : view.finished.slice(0, RECENT_LIMIT)}
                  coursesById={view.coursesById}
                  onEdit={dialogs.openEdit}
                  onDelete={dialogs.openDelete}
                />
                {view.finished.length > RECENT_LIMIT && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? 'Show fewer' : `Show all ${view.finished.length} sessions`}
                  </Button>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {ready && (
        <>
          <FormDialog
            open={formOpen}
            onOpenChange={(open) => !open && dialogs.close()}
            title={editingRunning ? 'Enter the actual duration' : dialogs.dialog.kind === 'edit' ? 'Edit study session' : 'Log a study session'}
            description={editingRunning ? 'This finishes the timer with the time you really studied.' : undefined}
          >
            {formOpen && (
              <StudyLogForm
                session={dialogs.dialog.kind === 'edit' ? dialogs.dialog.item : undefined}
                courses={ready.data.courses}
                semesters={ready.data.semesters}
                onSaved={dialogs.handleSaved}
                onCancel={dialogs.close}
              />
            )}
          </FormDialog>
          <ConfirmDialog
            open={dialogs.dialog.kind === 'delete'}
            onOpenChange={(open) => !open && dialogs.close()}
            title="Delete this study session?"
            description="Its time will be removed from your totals."
            confirmLabel="Delete session"
            onConfirm={() => (dialogs.dialog.kind === 'delete' ? dialogs.confirmDelete(dialogs.dialog.item) : Promise.resolve())}
          />
        </>
      )}
    </>
  )
}
