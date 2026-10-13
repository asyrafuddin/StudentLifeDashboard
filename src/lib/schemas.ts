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

// ---------------------------------------------------------------------------
// Shared helpers. HTML inputs always give strings, so these turn text into the
// right types: '' -> null for optional fields, '3.5' -> 3.5 for numbers.
// ---------------------------------------------------------------------------

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((v) => (v === '' ? null : v))

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date')

/** Preset course colors. Names are read out by screen readers. */
export const COURSE_COLORS = [
  { value: '#6366f1', name: 'Indigo' },
  { value: '#0ea5e9', name: 'Sky blue' },
  { value: '#10b981', name: 'Emerald' },
  { value: '#f59e0b', name: 'Amber' },
  { value: '#ef4444', name: 'Red' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#8b5cf6', name: 'Violet' },
  { value: '#14b8a6', name: 'Teal' },
  { value: '#f97316', name: 'Orange' },
  { value: '#64748b', name: 'Slate' },
] as const

// ---------------------------------------------------------------------------
// Semesters
// ---------------------------------------------------------------------------

export const semesterSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Keep it under 100 characters'),
    start_date: isoDate,
    end_date: isoDate,
    is_current: z.boolean(),
  })
  // 'YYYY-MM-DD' strings compare correctly as text.
  .refine((v) => v.end_date >= v.start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date'],
  })
export type SemesterFormValues = z.infer<typeof semesterSchema>

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const courseSchema = z.object({
  semester_id: z.string().min(1, 'Choose a semester'),
  course_code: z.string().trim().min(1, 'Course code is required').max(20, 'Keep it under 20 characters'),
  course_name: z.string().trim().min(1, 'Course name is required').max(150, 'Keep it under 150 characters'),
  instructor: optionalText(100),
  credits: z
    .string()
    .trim()
    .min(1, 'Credits are required (use 0 if the course has none)')
    .refine((v) => /^\d{1,2}(\.\d)?$/.test(v), 'Use a number from 0 to 99, with at most one decimal (e.g. 3 or 1.5)')
    .transform(Number),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Choose a color'),
})
export type CourseFormInput = z.input<typeof courseSchema>
export type CourseFormValues = z.output<typeof courseSchema>

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export const assignmentSchema = z
  .object({
    course_id: z.string().min(1, 'Choose a course'),
    title: z.string().trim().min(1, 'Title is required').max(200, 'Keep it under 200 characters'),
    description: optionalText(5000),
    due_date: z.union([z.literal(''), isoDate]),
    due_time: z.union([z.literal(''), z.string().regex(/^\d{2}:\d{2}$/, 'Enter a valid time')]),
    priority: z.enum(['low', 'medium', 'high']),
    status: z.enum(['not_started', 'in_progress', 'completed']),
    estimated_minutes: z
      .string()
      .trim()
      .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 100000), {
        message: 'Use a whole number of minutes, greater than 0',
      })
      .transform((v) => (v === '' ? null : Number(v))),
  })
  .refine((v) => v.due_time === '' || v.due_date !== '', {
    message: 'Add a due date, or clear the time',
    path: ['due_date'],
  })
  // Combine the separate date + time boxes into one timestamp. The date/time
  // are read as the browser's local time; no time means end of day (23:59).
  .transform(({ due_date, due_time, ...rest }) => ({
    ...rest,
    due_at: due_date ? new Date(`${due_date}T${due_time || '23:59'}:00`).toISOString() : null,
  }))
export type AssignmentFormInput = z.input<typeof assignmentSchema>
export type AssignmentFormValues = z.output<typeof assignmentSchema>
