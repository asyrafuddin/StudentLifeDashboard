import { z } from 'zod'
import type { DayOfWeek } from '@/types/database'

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

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

const timeOfDay = z.string().regex(/^\d{2}:\d{2}$/, 'Enter a valid time')

export const examSchema = z
  .object({
    course_id: z.string().min(1, 'Choose a course'),
    title: z.string().trim().min(1, 'Title is required').max(200, 'Keep it under 200 characters'),
    exam_type: optionalText(50),
    date: isoDate,
    time: timeOfDay,
    location: optionalText(200),
    notes: optionalText(5000),
  })
  // The date + time are the browser's local time, stored as a full timestamp.
  .transform(({ date, time, ...rest }) => ({
    ...rest,
    starts_at: new Date(`${date}T${time}:00`).toISOString(),
  }))
export type ExamFormInput = z.input<typeof examSchema>
export type ExamFormValues = z.output<typeof examSchema>

// ---------------------------------------------------------------------------
// Class sessions (weekly timetable)
// ---------------------------------------------------------------------------

export const classSessionSchema = z
  .object({
    course_id: z.string().min(1, 'Choose a course'),
    // From a <select>, so it's a string: '1' (Monday) to '7' (Sunday).
    day_of_week: z
      .string()
      .regex(/^[1-7]$/, 'Choose a day')
      .transform((v) => Number(v) as DayOfWeek),
    start_time: timeOfDay,
    end_time: timeOfDay,
    location: optionalText(200),
    instructor: optionalText(100),
  })
  // 'HH:MM' strings compare correctly as text.
  .refine((v) => v.end_time > v.start_time, {
    message: 'End time must be after the start time',
    path: ['end_time'],
  })
export type ClassSessionFormInput = z.input<typeof classSessionSchema>
export type ClassSessionFormValues = z.output<typeof classSessionSchema>

// ---------------------------------------------------------------------------
// Numbers typed into text boxes
// ---------------------------------------------------------------------------

/**
 * An optional, non-negative decimal typed as text: '' -> null, '42.5' -> 42.5.
 * Limits match the database column (e.g. numeric(5,2) -> 2 decimals).
 */
function optionalDecimal({
  max,
  decimals,
  greaterThanZero = false,
  message,
}: {
  max: number
  decimals: number
  greaterThanZero?: boolean
  message: string
}) {
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`)
  return z
    .string()
    .trim()
    .refine((v) => {
      if (v === '') return true
      if (!pattern.test(v)) return false
      const n = Number(v)
      return n <= max && (!greaterThanZero || n > 0)
    }, message)
    .transform((v) => (v === '' ? null : Number(v)))
}

// ---------------------------------------------------------------------------
// Grades
// ---------------------------------------------------------------------------

export const gradeEntrySchema = z
  .object({
    assessment_name: z.string().trim().min(1, 'Name is required').max(150, 'Keep it under 150 characters'),
    score: optionalDecimal({ max: 999999, decimals: 2, message: 'Use a number of 0 or more (up to 2 decimals)' }),
    max_score: optionalDecimal({
      max: 999999,
      decimals: 2,
      greaterThanZero: true,
      message: 'Use a number greater than 0 (up to 2 decimals)',
    }),
    weight_percent: optionalDecimal({ max: 100, decimals: 2, message: 'Use a percentage from 0 to 100' }),
  })
  // A score only means something next to its maximum.
  .refine((v) => v.score === null || v.max_score !== null, {
    message: 'Add the maximum score too',
    path: ['max_score'],
  })
export type GradeEntryFormInput = z.input<typeof gradeEntrySchema>
export type GradeEntryFormValues = z.output<typeof gradeEntrySchema>

export const courseResultSchema = z
  .object({
    final_grade_letter: optionalText(10),
    final_grade_points: optionalDecimal({ max: 20, decimals: 2, message: 'Use a number from 0 to 20 (up to 2 decimals)' }),
    is_finalized: z.boolean(),
  })
  .refine((v) => !v.is_finalized || v.final_grade_letter !== null || v.final_grade_points !== null, {
    message: 'Enter a grade before marking it final',
    path: ['final_grade_letter'],
  })
export type CourseResultFormInput = z.input<typeof courseResultSchema>
export type CourseResultFormValues = z.output<typeof courseResultSchema>

export const gradeScaleEntrySchema = z.object({
  grade_letter: z.string().trim().min(1, 'Required').max(10, 'Max 10 characters'),
  grade_points: z
    .string()
    .trim()
    .min(1, 'Required')
    .refine((v) => /^\d{1,2}(\.\d{1,2})?$/.test(v) && Number(v) <= 20, 'Use 0–20 (up to 2 decimals)')
    .transform(Number),
})
export type GradeScaleEntryFormInput = z.input<typeof gradeScaleEntrySchema>
export type GradeScaleEntryFormValues = z.output<typeof gradeScaleEntrySchema>

// ---------------------------------------------------------------------------
// Study sessions
// ---------------------------------------------------------------------------

/** Course is optional for study sessions: '' means "no specific course". */
const optionalCourseId = z.string().transform((v) => (v === '' ? null : v))

/** Starting the timer: only the course and a note; times come from the clock. */
export const studyTimerSchema = z.object({
  course_id: optionalCourseId,
  notes: optionalText(2000),
})
export type StudyTimerFormInput = z.input<typeof studyTimerSchema>
export type StudyTimerFormValues = z.output<typeof studyTimerSchema>

/** Logging (or editing) a finished session: start date/time + how long it lasted. */
export const studyLogSchema = z
  .object({
    course_id: optionalCourseId,
    date: isoDate,
    start_time: timeOfDay,
    duration_minutes: z
      .string()
      .trim()
      .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1440, 'Use whole minutes from 1 to 1440 (24 hours)')
      .transform(Number),
    notes: optionalText(2000),
  })
  .transform(({ date, start_time, duration_minutes, ...rest }) => {
    const started = new Date(`${date}T${start_time}:00`) // browser's local time
    return {
      ...rest,
      started_at: started.toISOString(),
      ended_at: new Date(started.getTime() + duration_minutes * 60_000).toISOString(),
      duration_seconds: duration_minutes * 60,
    }
  })
export type StudyLogFormInput = z.input<typeof studyLogSchema>
export type StudyLogFormValues = z.output<typeof studyLogSchema>
