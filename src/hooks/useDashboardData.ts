import { useState } from 'react'
import type { DashboardData } from '@/lib/dashboard-stats'
import { createDemoData, createEmptyDemoData } from '@/lib/demo-data'

/**
 * Loads everything the dashboard needs.
 *
 * STAGE 1: returns in-memory sample data (demo mode). Nothing is saved.
 * Later stages replace the body with Supabase queries; the return shape
 * (`status` + `data`) already matches an async fetch, so pages using this hook
 * won't need to change much.
 */

export type DemoVariant = 'sample' | 'empty'

export type DashboardDataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DashboardData; isDemo: boolean }

export function useDashboardData(variant: DemoVariant): DashboardDataState {
  // Generate demo dates once per page load, relative to when the page opened.
  const [demo] = useState(() => {
    const now = new Date()
    return { sample: createDemoData(now), empty: createEmptyDemoData(now) }
  })
  return { status: 'ready', data: demo[variant], isDemo: true }
}
