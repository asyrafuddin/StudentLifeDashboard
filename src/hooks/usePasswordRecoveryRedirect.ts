import { useEffect } from 'react'
import type { createBrowserRouter } from 'react-router'
import { supabase } from '@/lib/supabase'
import { UPDATE_PASSWORD_PATH } from '@/services/auth'

/**
 * Someone who opens a password-reset link is signed in for that purpose.
 * Normally the link points at the "choose a new password" page, but if
 * Supabase sends them elsewhere (e.g. that address isn't in its allowed
 * list), take them there anyway rather than straight into the app.
 */
export function usePasswordRecoveryRedirect(router: ReturnType<typeof createBrowserRouter>): void {
  useEffect(() => {
    if (!supabase) return
    const goToUpdatePassword = () => {
      if (router.state.location.pathname !== UPDATE_PASSWORD_PATH) {
        void router.navigate(UPDATE_PASSWORD_PATH, { replace: true })
      }
    }
    // The link's address carries "type=recovery" (if Supabase hasn't tidied it away yet)...
    if (/[#&?]type=recovery\b/.test(window.location.hash + window.location.search)) goToUpdatePassword()
    // ...and Supabase announces the recovery sign-in.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') goToUpdatePassword()
    })
    return () => data.subscription.unsubscribe()
  }, [router])
}
