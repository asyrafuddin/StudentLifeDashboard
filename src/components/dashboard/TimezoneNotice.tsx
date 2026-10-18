import { Globe } from 'lucide-react'
import { Link } from 'react-router'

/**
 * The app shows dates and times in this device's timezone. If that differs
 * from the timezone saved in the profile (e.g. while travelling, or a profile
 * left at the default UTC), say so, so deadlines are never silently confusing.
 */
export function TimezoneNotice({ profileTimezone }: { profileTimezone: string }) {
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (profileTimezone === deviceTimezone) return null

  return (
    <p className="mb-6 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
      <Globe className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        Times are shown in this device's timezone ({deviceTimezone.replaceAll('_', ' ')}), but your profile says{' '}
        {profileTimezone.replaceAll('_', ' ')}.{' '}
        <Link to="/settings" className="font-medium text-primary hover:underline">
          Update your profile
        </Link>{' '}
        if you've moved.
      </span>
    </p>
  )
}
