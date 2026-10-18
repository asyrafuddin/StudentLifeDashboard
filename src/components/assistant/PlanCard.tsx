import { Bot, ListChecks } from 'lucide-react'
import { Link } from 'react-router'
import type { StudyPlan, StudySuggestion } from '@shared/study-assistant-contract'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AssistantItem } from '@/lib/assistant'

const PRIORITY_LABELS: Record<StudySuggestion['priority'], { label: string; className: string }> = {
  high: { label: 'High priority', className: 'bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200' },
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
}

interface PlanCardProps {
  plan: StudyPlan
  items: Record<string, AssistantItem>
  source: 'rules' | 'ai'
}

/** A study plan, labelled with where it came from. Suggestions link to the items they mention. */
export function PlanCard({ plan, items, source }: PlanCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">
            <h2>Suggested plan</h2>
          </CardTitle>
          {source === 'ai' ? (
            <Badge variant="secondary">
              <Bot aria-hidden />
              AI-generated suggestions
            </Badge>
          ) : (
            <Badge variant="outline">
              <ListChecks aria-hidden />
              Rule-based suggestions
            </Badge>
          )}
        </div>
        <CardDescription>{plan.summary}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {plan.suggestions.map((s, i) => (
            <li key={i} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 font-medium break-words">{s.title}</p>
                <Badge className={PRIORITY_LABELS[s.priority].className}>{PRIORITY_LABELS[s.priority].label}</Badge>
              </div>
              <p className="mt-1 text-sm break-words text-muted-foreground">{s.detail}</p>
              <RelatedItems refs={s.related} items={items} />
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function RelatedItems({ refs, items }: { refs: string[]; items: Record<string, AssistantItem> }) {
  // Refs the app doesn't know (e.g. made up by the AI) are simply skipped.
  const known = [...new Set(refs)].filter((ref) => items[ref])
  if (known.length === 0) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Related items">
      {known.map((ref) => {
        const item = items[ref]
        return (
          <li key={ref} className="max-w-full">
            <Link
              to={`/courses/${item.courseId}`}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
              <span className="shrink-0 font-medium">{item.courseCode}</span>
              <span className="truncate">
                {item.kind === 'exam' ? 'Exam: ' : ''}
                {item.title}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
