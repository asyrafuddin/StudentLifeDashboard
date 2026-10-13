import type { Session, User } from '@supabase/supabase-js'
import { createContext } from 'react'

/**
 * - `demo`: Supabase isn't configured, so the app shows sample data without sign-in.
 * - `loading`: checking for a saved session (brief, on first page load).
 */
export type AuthState =
  | { status: 'demo' }
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'signed_in'; session: Session; user: User }

export type AuthContextValue = AuthState & {
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
