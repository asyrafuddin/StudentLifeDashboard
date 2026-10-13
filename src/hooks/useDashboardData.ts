import { useCallback, useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/hooks/useAuth'
import type { DashboardData } from '@/lib/dashboard-stats'
import { createDemoData, createEmptyDemoData } from '@/lib/demo-data'
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

  const loader = useCallback(() => fetchDashboardData(userId!, email), [userId, email])
  const remote = useAsync(userId ? loader : null)

  if (auth.status === 'demo') return { status: 'ready', data: demo[demoVariant], isDemo: true }
  if (remote.status === 'ready') return { status: 'ready', data: remote.data, isDemo: false }
  if (remote.status === 'error') return remote
  return { status: 'loading' }
}
