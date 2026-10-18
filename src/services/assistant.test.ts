/**
 * How the app reads the assistant function's replies: each failure becomes a
 * reason the page can explain (and the page then keeps the rule-based plan).
 */
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssistantRequest, StudyPlan } from '@shared/study-assistant-contract'
import { requestAiPlan } from '@/services/assistant'

const invoke = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({ requireSupabase: () => ({ functions: { invoke } }) }))

const request = { now: '2026-10-18 09:00', weekday: 'Sunday', courses: [], assignments: [], exams: [], study_minutes_this_week: [] } as AssistantRequest
const plan: StudyPlan = { summary: 'Light week.', suggestions: [{ title: 'Review notes', detail: 'Thirty minutes.', priority: 'low', related: [] }] }

const httpError = (status: number, body: unknown) =>
  ({ data: null, error: new FunctionsHttpError(new Response(JSON.stringify(body), { status })) })

beforeEach(() => invoke.mockReset())

describe('requestAiPlan', () => {
  it('sends the request to the study-assistant function and returns the plan', async () => {
    invoke.mockResolvedValue({ data: { plan, model: 'gemini-flash-latest' }, error: null })
    expect(await requestAiPlan(request)).toEqual({ ok: true, plan, model: 'gemini-flash-latest' })
    expect(invoke).toHaveBeenCalledWith('study-assistant', { body: request })
  })

  it("rejects a reply that isn't a valid plan", async () => {
    invoke.mockResolvedValue({ data: { plan: { summary: 'x', suggestions: [] } }, error: null })
    expect(await requestAiPlan(request)).toMatchObject({ ok: false, code: 'ai_unavailable' })
  })

  it("passes on the function's own explanation (e.g. the daily limit)", async () => {
    invoke.mockResolvedValue(httpError(429, { error: { code: 'rate_limited', message: "You've reached today's limit." } }))
    expect(await requestAiPlan(request)).toEqual({ ok: false, code: 'rate_limited', message: "You've reached today's limit." })
  })

  it('recognises a function that has not been deployed', async () => {
    invoke.mockResolvedValue(httpError(404, { code: 'NOT_FOUND', message: 'Requested function was not found' }))
    expect(await requestAiPlan(request)).toMatchObject({ ok: false, code: 'not_deployed' })
  })

  it("treats Supabase's own sign-in rejection as an expired session", async () => {
    invoke.mockResolvedValue(httpError(401, { msg: 'Invalid JWT' }))
    expect(await requestAiPlan(request)).toMatchObject({ ok: false, code: 'unauthorized' })
  })

  it('reports a network failure as offline', async () => {
    invoke.mockResolvedValue({ data: null, error: new FunctionsFetchError(new TypeError('Failed to fetch')) })
    expect(await requestAiPlan(request)).toMatchObject({ ok: false, code: 'offline' })
  })
})
