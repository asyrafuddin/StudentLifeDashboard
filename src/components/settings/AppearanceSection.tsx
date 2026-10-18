import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { THEME_OPTIONS } from '@/lib/theme'
import { cn } from '@/lib/utils'

/** Light / dark / device theme, as a plain radio group (works with keyboard and screen readers). */
export function AppearanceSection() {
  const { theme = 'system', setTheme } = useTheme()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Saved in this browser.</CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset>
          <legend className="sr-only">Theme</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {THEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                  'has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
                  theme === option.value && 'border-primary bg-primary/5 font-medium',
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                  className="accent-primary"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  )
}
