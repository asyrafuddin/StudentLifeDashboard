import { z } from 'zod'

/**
 * Form validation rules, kept in one place so every form (and the tests)
 * share the same definitions. Limits match the database constraints in
 * supabase/migrations, so users see a friendly message before the database
 * would reject the data.
 */

export const PASSWORD_MIN_LENGTH = 8

const email = z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email address'))

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
})
export type SignInValues = z.infer<typeof signInSchema>

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Your name is required').max(100, 'Keep it under 100 characters'),
    email,
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
      .max(72, 'Use at most 72 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
export type SignUpValues = z.infer<typeof signUpSchema>

/** True if the browser recognizes this IANA timezone name (e.g. "Asia/Kuala_Lumpur"). */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const profileSchema = z.object({
  display_name: z.string().trim().min(1, 'Your name is required').max(100, 'Keep it under 100 characters'),
  // Empty input means "not set" and is saved as null.
  university_name: z
    .string()
    .trim()
    .max(200, 'Keep it under 200 characters')
    .transform((v) => (v === '' ? null : v)),
  timezone: z.string().refine(isValidTimezone, 'Choose a valid timezone'),
})
export type ProfileFormInput = z.input<typeof profileSchema>
export type ProfileFormValues = z.output<typeof profileSchema>
