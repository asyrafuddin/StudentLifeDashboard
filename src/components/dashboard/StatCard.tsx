import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: LucideIcon
  /** Small supporting line under the value, e.g. "1 overdue". */
  hint?: ReactNode
  /** Use for long text values like "Insufficient data" so they don't look like a number. */
  valueIsText?: boolean
}

export function StatCard({ label, value, icon: Icon, hint, valueIsText }: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="size-4 text-muted-foreground" aria-hidden />
        </div>
        <p
          className={cn(
            'font-semibold tracking-tight',
            valueIsText ? 'text-base text-muted-foreground' : 'text-2xl tabular-nums',
          )}
        >
          {value}
        </p>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  )
}
