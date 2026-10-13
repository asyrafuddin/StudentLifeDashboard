import { Navigate, Outlet, useLocation } from 'react-router'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { useAuth } from '@/hooks/useAuth'

/**
 * Wraps private pages. Signed-out visitors are sent to /login, which sends
 * them back here after signing in. In demo mode (no Supabase) pages are open
 * because they only show sample data.
 *
 * This is a convenience for the user interface. The real protection is Row
 * Level Security in the database: without a valid session, it returns no data.
 */
export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') return <FullPageSpinner />
  if (auth.status === 'signed_out') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Wraps /login and /signup: already signed-in users skip straight to the app. */
export function PublicOnly() {
  const auth = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (auth.status === 'loading') return <FullPageSpinner />
  // In demo mode there is no sign-in, so go straight to the app.
  if (auth.status === 'signed_in' || auth.status === 'demo') return <Navigate to={from} replace />
  return <Outlet />
}
