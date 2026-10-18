import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

/** Explains failed saves before the user wonders why: shown only while offline. */
export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      You're offline. You can keep reading, but changes can't be saved until your connection is back.
    </div>
  )
}
