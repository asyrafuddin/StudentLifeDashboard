/**
 * Turns errors from Supabase (or anything else) into a message a student can
 * act on. Raw technical details are logged to the console for debugging.
 */
const FRIENDLY_MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Incorrect email or password.'],
  [/email not confirmed/i, 'Please confirm your email first. Check your inbox for the link.'],
  [/user already registered/i, 'An account with this email already exists. Try signing in.'],
  [/password should be at least/i, 'Password is too short.'],
  [/rate limit|too many requests/i, 'Too many attempts. Please wait a minute and try again.'],
  [/failed to fetch|network/i, "Can't reach the server. Check your internet connection."],
  [/row-level security|permission denied/i, "You don't have permission to do that."],
  // Specific constraints first, so they beat the generic messages below.
  [/courses_code_unique_per_semester/i, 'You already have a course with this code in that semester.'],
  [/delete on table "semesters" violates foreign key/i, 'This semester still has courses. Move or delete them first.'],
  [/violates foreign key constraint/i, 'This item is linked to other records, so it cannot be changed this way.'],
  [/duplicate key value/i, 'An item with these details already exists.'],
  [/violates check constraint/i, 'Some values are not allowed. Please check the form.'],
]

export function getErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error)

  for (const [pattern, friendly] of FRIENDLY_MESSAGES) {
    if (pattern.test(raw)) return friendly
  }
  console.error(error)
  return raw || 'Something went wrong. Please try again.'
}
