import type { SignInValues, SignUpValues } from '@/lib/schemas'
import { requireSupabase } from '@/lib/supabase'

/** Signs in with email + password. Throws on failure. */
export async function signIn({ email, password }: SignInValues): Promise<void> {
  const { error } = await requireSupabase().auth.signInWithPassword({ email, password })
  if (error) throw error
}

/**
 * Creates an account. The display name and the browser's timezone are passed
 * as metadata; a database trigger copies them into the new `profiles` row.
 *
 * Returns whether the user must confirm their email before signing in
 * (true when "Confirm email" is enabled in Supabase, the default).
 */
export async function signUp({ displayName, email, password }: SignUpValues): Promise<{ needsEmailConfirmation: boolean }> {
  const { data, error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      // Where the confirmation link in the email sends the user back to.
      emailRedirectTo: window.location.origin,
    },
  })
  if (error) throw error
  return { needsEmailConfirmation: data.session === null }
}
