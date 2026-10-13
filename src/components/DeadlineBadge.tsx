import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { DeadlineState } from '@/lib/dashboard-stats'

/**
 * Shows urgency with an icon AND a word, never color alone, so it works for
 * color-blind users. Renders nothing for ordinary upcoming deadlines.
 */
export function DeadlineBadge({ state }: { state: DeadlineState }) {
  switch (state) {
    case 'overdue':
      return (
        <Badge variant="destructive">
          <AlertCircle aria-hidden />
          Overdue
        </Badge>
      )
    case 'due_soon':
      return (
        <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
          <Clock aria-hidden />
          Due soon
        </Badge>
      )
    case 'completed':
      return (
        <Badge className="bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200">
          <CheckCircle2 aria-hidden />
          Done
        </Badge>
      )
    default:
      return null
  }
}
