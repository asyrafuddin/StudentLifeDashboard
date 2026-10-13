import { useEffect, useState } from 'react'

/**
 * The current time, refreshed every `intervalMs` (default: 1 minute) so that
 * relative labels like "due in 3 hours" stay accurate while the page is open.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
