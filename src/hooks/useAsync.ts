import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/errors'

/**
 * Runs an async loader (e.g. a Supabase query) and tracks its result.
 *
 * - Pass a STABLE function (wrap it in useCallback). The loader re-runs when
 *   that function changes, or when you call `reload()`, e.g. after saving.
 * - Pass `null` to skip loading (e.g. in demo mode).
 * - While reloading, the previous data stays on screen (`isRefreshing: true`)
 *   instead of flashing a spinner after every save.
 * - `mutate` updates the data locally right away, for instant feedback
 *   (e.g. ticking a checkbox) before the server confirms.
 * - Data refreshes by itself when the user comes back to the tab (if it's
 *   older than REFRESH_AFTER_MS) and when the connection comes back, so
 *   changes made in another tab or device show up.
 */

/** Minimum age of data before returning to the tab triggers a refresh. */
export const REFRESH_AFTER_MS = 30_000

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | {
      status: 'ready'
      data: T
      isRefreshing: boolean
      reload: () => void
      mutate: (update: (data: T) => T) => void
    }

/** A finished load, remembering which loader + attempt produced it. */
type Settled<T> = { loader: unknown; attempt: number } & (
  | { ok: true; data: T }
  | { ok: false; message: string }
)

export function useAsync<T>(loader: (() => Promise<T>) | null): AsyncState<T> {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  /** When the last load finished (ms), to decide if returning to the tab should refresh. */
  const lastSettledAt = useRef(0)
  /** The loader whose data we currently have, if any (see failed refreshes below). */
  const loadedDataFor = useRef<unknown>(null)

  useEffect(() => {
    if (!loader) return
    // Ignore results that arrive after the component unmounts or a newer load starts.
    let cancelled = false
    const finish = (result: Settled<T>) => {
      if (cancelled) return
      lastSettledAt.current = Date.now()
      if (!result.ok && loadedDataFor.current === loader) {
        // A REFRESH failed but we already have data: keep showing it rather
        // than replacing the page with an error, and mention the problem.
        toast.error(`Couldn't refresh: ${result.message}`)
        setSettled((prev) => (prev?.ok ? { ...prev, attempt } : result))
        return
      }
      if (result.ok) loadedDataFor.current = loader
      setSettled(result)
    }
    loader()
      .then((data) => finish({ loader, attempt, ok: true, data }))
      .catch((error) => finish({ loader, attempt, ok: false, message: getErrorMessage(error) }))
    return () => {
      cancelled = true
    }
  }, [loader, attempt])

  // Refresh on returning to the tab (if the data is old enough) or reconnecting.
  useEffect(() => {
    if (!loader) return
    const onReturn = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastSettledAt.current > REFRESH_AFTER_MS) reload()
    }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('online', reload)
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('online', reload)
    }
  }, [loader, reload])

  const mutate = useCallback((update: (data: T) => T) => {
    setSettled((s) => (s && s.ok ? { ...s, data: update(s.data) } : s))
  }, [])

  if (!loader) return { status: 'idle' }
  const isCurrent = settled !== null && settled.loader === loader && settled.attempt === attempt

  if (settled?.ok) {
    return { status: 'ready', data: settled.data, isRefreshing: !isCurrent, reload, mutate }
  }
  if (settled && isCurrent) return { status: 'error', message: settled.message, retry: reload }
  return { status: 'loading' }
}
