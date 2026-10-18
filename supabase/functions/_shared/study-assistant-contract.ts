/**
 * The contract between the app and the `study-assistant` Edge Function:
 * exactly what the browser may send, and exactly what a study plan looks like.
 *
 * Both sides use this file. The browser builds requests that match it; the
 * server re-checks every request against it (it never trusts the browser) and
 * also checks the AI's answer before passing it on.
 *
 * Only plain TypeScript and Zod, so it runs in both Vite (browser) and Deno
 * (Supabase Edge Functions).
 *
 * Privacy: the request holds only what's needed to plan study time. No names,
 * emails, ids, descriptions, notes, locations or grades.
 */
import { z } from 'zod'

/** Caps that keep requests (and AI costs) small. */
export const ASSISTANT_LIMITS = {
  courses: 15,
  assignments: 20,
  exams: 10,
  suggestions: 6,
} as const

/** "2026-10-18 14:30", in the student's own local time. */
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, 'Expected "YYYY-MM-DD HH:mm"')

const text = (max: number) => z.string().trim().min(1).max(max)

/** Short handles like "A3" (assignment) or "E1" (exam) that suggestions use to point at items. */
const itemRef = z.string().regex(/^[AE]\d{1,2}$/)

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
const PRIORITIES = ['high', 'medium', 'low'] as const

// Text limits match the database (see supabase/migrations).
export const assistantRequestSchema = z
  .object({
    now: localDateTime,
    weekday: z.enum(WEEKDAYS),
    courses: z
      .array(z.object({ code: text(20), name: text(150), credits: z.number().min(0).max(99) }).strict())
      .max(ASSISTANT_LIMITS.courses),
    assignments: z
      .array(
        z
          .object({
            ref: itemRef,
            course: text(20),
            title: text(200),
            due: localDateTime,
            /** Calendar days from today: 0 = today, -2 = two days ago. */
            days_until_due: z.number().int().min(-366).max(366),
            overdue: z.boolean(),
            priority: z.enum(PRIORITIES),
            status: z.enum(['not_started', 'in_progress']),
            estimated_minutes: z.number().int().min(1).max(100_000).nullable(),
          })
          .strict(),
      )
      .max(ASSISTANT_LIMITS.assignments),
    exams: z
      .array(
        z
          .object({
            ref: itemRef,
            course: text(20),
            title: text(200),
            type: text(50).nullable(),
            starts: localDateTime,
            days_until: z.number().int().min(0).max(366),
          })
          .strict(),
      )
      .max(ASSISTANT_LIMITS.exams),
    /** Finished study time this week (Monday to now), per course code. "Other" = no course. */
    study_minutes_this_week: z
      .array(z.object({ course: text(20), minutes: z.number().int().min(0).max(10_080) }).strict())
      .max(ASSISTANT_LIMITS.courses + 1),
  })
  .strict()

export type AssistantRequest = z.infer<typeof assistantRequestSchema>

export const studyPlanSchema = z
  .object({
    summary: text(400),
    suggestions: z
      .array(
        z
          .object({
            title: text(120),
            detail: text(600),
            priority: z.enum(PRIORITIES),
            /** Items this suggestion is about; unknown refs are ignored by the app. */
            related: z.array(itemRef).max(5),
          })
          .strict(),
      )
      .min(1)
      .max(ASSISTANT_LIMITS.suggestions),
  })
  .strict()

export type StudyPlan = z.infer<typeof studyPlanSchema>
export type StudySuggestion = StudyPlan['suggestions'][number]

/** What the function sends back. `error.code` lets the app explain what happened. */
export type AssistantResponse =
  | { plan: StudyPlan; model: string }
  | { error: { code: AssistantErrorCode; message: string } }

export type AssistantErrorCode =
  | 'unauthorized'
  | 'invalid_request'
  | 'not_configured'
  | 'rate_limited'
  | 'ai_unavailable'
