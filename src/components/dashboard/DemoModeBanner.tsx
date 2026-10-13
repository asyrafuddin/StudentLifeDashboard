import { FlaskConical } from 'lucide-react'
import type { DemoVariant } from '@/hooks/useDashboardData'
import { cn } from '@/lib/utils'

interface DemoModeBannerProps {
  variant: DemoVariant
  onVariantChange: (variant: DemoVariant) => void
}

/** Makes it impossible to mistake sample data for real data. */
export function DemoModeBanner({ variant, onVariantChange }: DemoModeBannerProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
      <div className="flex gap-3">
        <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="text-sm">
          <p className="font-medium">Demo mode: you're looking at sample data</p>
          <p className="text-amber-900/80 dark:text-amber-100/80">
            Nothing here is real or saved. Sign-in and your own data arrive once Supabase is
            connected.
          </p>
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="Demo data"
        className="inline-flex shrink-0 self-start rounded-lg border border-amber-300 bg-white p-0.5 sm:self-auto dark:border-amber-500/40 dark:bg-transparent"
      >
        {(['sample', 'empty'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={variant === option}
            onClick={() => onVariantChange(option)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-amber-500/50 focus-visible:outline-none',
              variant === option
                ? 'bg-amber-100 text-amber-950 dark:bg-amber-500/25 dark:text-amber-50'
                : 'text-amber-900/70 hover:text-amber-950 dark:text-amber-100/70',
            )}
          >
            {option === 'sample' ? 'Sample data' : 'Empty account'}
          </button>
        ))}
      </div>
    </div>
  )
}
