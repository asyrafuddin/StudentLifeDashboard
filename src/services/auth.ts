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

/** Where the "reset your password" email link sends people. */
export const UPDATE_PASSWORD_PATH = '/update-password'

/**
 * Emails a password-reset link. Supabase gives the same response whether or
 * not the email has an account, so this never reveals who is signed up.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${UPDATE_PASSWORD_PATH}`,
  })
  if (error) throw error
}

/** Sets a new password for the signed-in user (including someone who arrived via a reset link). */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await requireSupabase().auth.updateUser({ password })
  if (error) throw error
}
