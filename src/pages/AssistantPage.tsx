import { BookOpen, Info, Loader2, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { StudyPlan } from '@shared/study-assistant-contract'
import { PlanCard } from '@/components/assistant/PlanCard'
import { SharedDataPreview } from '@/components/assistant/SharedDataPreview'
import { ListSkeleton, LoadError } from '@/components/AsyncStatus'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useNow } from '@/hooks/useNow'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { type AssistantItem, buildAssistantInput, buildRuleBasedPlan } from '@/lib/assistant'
import { type DashboardData, pickDefaultSemester } from '@/lib/dashboard-stats'
import { type AiPlanResult, requestAiPlan } from '@/services/assistant'

const TITLE = 'Study Assistant'
const DESCRIPTION = 'Suggestions for the week ahead, based on your deadlines, exams and study time.'

export function AssistantPage() {
  // In demo mode this gives the sample data, so the rule-based plan works there too.
  const state = useDashboardData('sample')

  if (state.status === 'loading') {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <ListSkeleton />
      </>
    )
  }
  if (state.status === 'error') {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <LoadError message={state.message} onRetry={state.retry} />
      </>
    )
  }
  return <AssistantContent data={state.data} isDemo={state.isDemo} />
}

type AiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; plan: StudyPlan; items: Record<string, AssistantItem> }
  | { status: 'failed'; result: Extract<AiPlanResult, { ok: false }> }

function AssistantContent({ data, isDemo }: { data: DashboardData; isDemo: boolean }) {
  const now = useNow()
  const online = useOnlineStatus()
  const semester = pickDefaultSemester(data.semesters)
  const input = useMemo(() => buildAssistantInput(data, semester?.id ?? null, now), [data, semester?.id, now])
  const rulePlan = useMemo(() => buildRuleBasedPlan(input.request), [input])
  const [ai, setAi] = useState<AiState>({ status: 'idle' })

  async function askAi() {
    // The items are captured with the request, so the answer's refs keep pointing at the right things.
    const sent = input
    setAi({ status: 'loading' })
    const result = await requestAiPlan(sent.request)
    setAi(result.ok ? { status: 'ready', plan: result.plan, items: sent.items } : { status: 'failed', result })
  }

  if (input.request.courses.length === 0) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <Card>
          <CardContent>
            <EmptyState
              icon={BookOpen}
              title="Add your courses first"
              description="The assistant plans around your current semester's assignments, exams and study time."
            >
              <Button asChild>
                <Link to="/courses?new=1">Add a course</Link>
              </Button>
            </EmptyState>
          </CardContent>
        </Card>
      </>
    )
  }

  const showingAi = ai.status === 'ready'

  return (
    <>
      <PageHeader
        title={TITLE}
        description={semester ? `${DESCRIPTION} Semester: ${semester.name}.` : DESCRIPTION}
      />

      <Alert className="mb-4">
        <Info aria-hidden />
        <AlertDescription>
          These are suggestions, not instructions. Always check deadlines and requirements with your course. The
          assistant never changes your data.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          {ai.status === 'failed' && (
            <Alert>
              <Info aria-hidden />
              <AlertDescription>
                <p>
                  <span className="font-medium text-foreground">No AI suggestions this time.</span>{' '}
                  {ai.result.message}
                </p>
                <p>Showing the rule-based plan instead.</p>
              </AlertDescription>
            </Alert>
          )}
          {showingAi ? (
            <PlanCard plan={ai.plan} items={ai.items} source="ai" />
          ) : (
            <PlanCard plan={rulePlan} items={input.items} source="rules" />
          )}
        </div>

        <aside className="min-w-0 space-y-4" aria-label="AI suggestions">
          <Card>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">Want a more personal plan?</p>
              <p className="text-muted-foreground">
                The AI (Google's Gemini, free tier) can write suggestions from the same information. Requests go
                through this app's server, which keeps the AI key private. On the free tier, Google may use what's
                sent to improve its products, so see exactly what's shared below.
              </p>
              {isDemo ? (
                <p className="text-muted-foreground">AI suggestions need a real account; demo mode only shows the rule-based plan.</p>
              ) : (
                <>
                  <Button onClick={askAi} disabled={ai.status === 'loading' || !online} className="w-full">
                    {ai.status === 'loading' ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
                    {ai.status === 'loading' ? 'Asking the AI…' : showingAi ? 'Ask again' : 'Get AI suggestions'}
                  </Button>
                  {!online && <p className="text-muted-foreground">You're offline. Reconnect to ask the AI.</p>}
                  {showingAi && (
                    <Button variant="outline" className="w-full" onClick={() => setAi({ status: 'idle' })}>
                      Back to the rule-based plan
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">Up to 20 AI requests per day.</p>
                </>
              )}
            </CardContent>
          </Card>
          <SharedDataPreview request={input.request} />
        </aside>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {ai.status === 'loading' ? 'Asking the AI for suggestions' : showingAi ? 'AI suggestions are shown' : ''}
      </p>
    </>
  )
}
