import type { Session } from '@supabase/supabase-js'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext, type AuthState } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

function stateFromSession(session: Session | null): AuthState {
  return session ? { status: 'signed_in', session, user: session.user } : { status: 'signed_out' }
}

/** Tracks who is signed in and shares it with the whole app via useAuth(). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(supabase ? { status: 'loading' } : { status: 'demo' })

  useEffect(() => {
    if (!supabase) return

    // 1. Restore a saved session (Supabase keeps it in localStorage).
    supabase.auth.getSession().then(({ data }) => setState(stateFromSession(data.session)))

    // 2. React to future sign-ins, sign-outs and token refreshes.
    //    Keep this callback synchronous: Supabase warns against awaiting
    //    other Supabase calls inside it.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(stateFromSession(session))
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(() => ({ ...state, signOut }), [state, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
