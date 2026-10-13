import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { DashboardData } from '@/lib/dashboard-stats'
import { createDemoData, createEmptyDemoData } from '@/lib/demo-data'
import { getErrorMessage } from '@/lib/errors'
import { fetchDashboardData } from '@/services/dashboard'

/**
 * Loads everything the dashboard needs.
 *  - Signed in: real records from Supabase.
 *  - Demo mode (Supabase not configured): in-memory sample data, never saved.
 */

export type DemoVariant = 'sample' | 'empty'

export type DashboardDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; data: DashboardData; isDemo: boolean }

/** A finished request, tagged with the request it answers. */
type RemoteResult =
  | { requestKey: string; status: 'error'; message: string }
  | { requestKey: string; status: 'ready'; data: DashboardData }

export function useDashboardData(demoVariant: DemoVariant): DashboardDataState {
  const auth = useAuth()
  // Plain strings, so a token refresh (new user object, same person) doesn't re-fetch.
  const userId = auth.status === 'signed_in' ? auth.user.id : null
  const email = auth.status === 'signed_in' ? (auth.user.email ?? '') : ''

  // Demo dates are generated once per page load, relative to when it opened.
  const [demo] = useState(() => {
    const now = new Date()
    return { sample: createDemoData(now), empty: createEmptyDemoData(now) }
  })

  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const [result, setResult] = useState<RemoteResult | null>(null)
  // Each user + retry combination is a separate request. While the latest
  // result belongs to an older request, we are "loading".
  const requestKey = `${userId}:${attempt}`

  useEffect(() => {
    if (!userId) return
    // Ignore the response if the user signs out or the page closes mid-request.
    let cancelled = false
    const key = `${userId}:${attempt}`
    fetchDashboardData(userId, email)
      .then((data) => !cancelled && setResult({ requestKey: key, status: 'ready', data }))
      .catch((error) => !cancelled && setResult({ requestKey: key, status: 'error', message: getErrorMessage(error) }))
    return () => {
      cancelled = true
    }
  }, [userId, email, attempt])

  if (auth.status === 'demo') return { status: 'ready', data: demo[demoVariant], isDemo: true }
  if (!result || result.requestKey !== requestKey) return { status: 'loading' }
  if (result.status === 'error') return { status: 'error', message: result.message, retry }
  return { status: 'ready', data: result.data, isDemo: false }
}
