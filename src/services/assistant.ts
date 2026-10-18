import { FunctionsHttpError } from '@supabase/supabase-js'
import {
  type AssistantErrorCode,
  type AssistantRequest,
  type StudyPlan,
  studyPlanSchema,
} from '@shared/study-assistant-contract'
import { requireSupabase } from '@/lib/supabase'

export type AiPlanResult =
  | { ok: true; plan: StudyPlan; model: string }
  | { ok: false; code: AssistantErrorCode | 'not_deployed' | 'offline'; message: string }

const KNOWN_CODES: AssistantErrorCode[] = ['unauthorized', 'invalid_request', 'not_configured', 'rate_limited', 'ai_unavailable']

/**
 * Asks the `study-assistant` Edge Function for AI suggestions.
 *
 * The AI key lives only on the server. The browser sends the minimal summary
 * (see buildAssistantInput) with the user's sign-in token, which Supabase
 * attaches automatically. Never throws: every failure becomes a reason the
 * page can explain, while it keeps showing the rule-based plan.
 */
export async function requestAiPlan(request: AssistantRequest): Promise<AiPlanResult> {
  const { data, error } = await requireSupabase().functions.invoke('study-assistant', { body: request })

  if (!error) {
    // Checked again here, so a misbehaving server can't break the page.
    const parsed = studyPlanSchema.safeParse(data?.plan)
    if (parsed.success) return { ok: true, plan: parsed.data, model: String(data.model ?? '') }
    return { ok: false, code: 'ai_unavailable', message: 'The AI gave an answer we could not use. Please try again.' }
  }

  if (error instanceof FunctionsHttpError) {
    const response = error.context as Response
    if (response.status === 404) {
      return { ok: false, code: 'not_deployed', message: "The assistant function isn't deployed to Supabase yet." }
    }
    const body = await response.json().catch(() => null)
    const reported = body?.error
    if (reported && KNOWN_CODES.includes(reported.code) && typeof reported.message === 'string') {
      return { ok: false, code: reported.code, message: reported.message }
    }
    if (response.status === 401) {
      return { ok: false, code: 'unauthorized', message: 'Your session has expired. Please sign in again.' }
    }
    return { ok: false, code: 'ai_unavailable', message: 'The assistant is unavailable right now. Please try again later.' }
  }

  // The request never got an answer: no connection, or the function couldn't be reached.
  return { ok: false, code: 'offline', message: "Couldn't reach the assistant. Check your internet connection." }
}
