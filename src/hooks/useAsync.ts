import { useCallback, useEffect, useState } from 'react'
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
 */

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

  useEffect(() => {
    if (!loader) return
    // Ignore results that arrive after the component unmounts or a newer load starts.
    let cancelled = false
    loader()
      .then((data) => !cancelled && setSettled({ loader, attempt, ok: true, data }))
      .catch((error) => !cancelled && setSettled({ loader, attempt, ok: false, message: getErrorMessage(error) }))
    return () => {
      cancelled = true
    }
  }, [loader, attempt])

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
