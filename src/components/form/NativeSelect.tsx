import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * A browser-native <select> styled like our Input. Better than a custom
 * dropdown for long lists (e.g. ~400 timezones): type-to-search, mobile
 * pickers and screen readers all work out of the box.
 */
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 py-1 text-base outline-none transition-colors md:text-sm',
        'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        'dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}
