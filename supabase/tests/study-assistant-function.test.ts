/**
 * Tests for the study-assistant Edge Function's handler, with fakes for
 * Supabase Auth, the usage limit and the AI service. They check the security
 * rules (sign-in, validation, limit, secret handling) and the AI round trip.
 *
 * Deno-specific wiring (index.ts) isn't run here; it's type-checked with
 * `deno check` and covered by the manual check in docs/ai-assistant.md.
 */
import { describe, expect, it, vi } from 'vitest'
import type { AssistantRequest, AssistantResponse, StudyPlan } from '../functions/_shared/study-assistant-contract.ts'
import { createHandler, type HandlerDeps } from '../functions/study-assistant/handler.ts'
import { buildModelRequest, extractPlan, geminiUrl, SYSTEM_PROMPT } from '../functions/study-assistant/prompt.ts'

const SECRET = 'AIza-test-secret-never-leak'

const request: AssistantRequest = {
  now: '2026-10-18 09:00',
  weekday: 'Sunday',
  courses: [{ code: 'CS201', name: 'Data Structures', credits: 3 }],
  assignments: [
    {
      ref: 'A1',
      course: 'CS201',
      title: 'Problem set 4',
      due: '2026-10-19 23:59',
      days_until_due: 1,
      overdue: false,
      priority: 'high',
      status: 'not_started',
      estimated_minutes: 120,
    },
  ],
  exams: [{ ref: 'E1', course: 'CS201', title: 'Midterm', type: 'Midterm', starts: '2026-10-24 09:00', days_until: 6 }],
  study_minutes_this_week: [{ course: 'CS201', minutes: 45 }],
}

const plan: StudyPlan = {
  summary: 'A busy week with one deadline and a midterm.',
  suggestions: [{ title: 'Finish Problem set 4 today', detail: 'Two focused hours.', priority: 'high', related: ['A1'] }],
}

/** Reads the function's JSON reply. */
const read = async (res: Response) => (await res.json()) as AssistantResponse & { error?: { code: string; message: string } }

/** A Gemini generateContent response whose text is the given JSON. */
const geminiBody = (answer: unknown) => ({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(answer) }] } }] })
function aiReply(answer: unknown, status = 200): Response {
  return new Response(JSON.stringify(geminiBody(answer)), { status })
}

function setup(overrides: Partial<HandlerDeps> = {}) {
  const deps: HandlerDeps = {
    apiKey: SECRET,
    model: 'gemini-flash-latest',
    getUserId: vi.fn(async (header: string) => (header === 'Bearer good-token' ? 'user-1' : null)),
    claimRequest: vi.fn(async () => true),
    fetch: vi.fn(async () => aiReply(plan)) as unknown as typeof fetch,
    log: vi.fn(),
    ...overrides,
  }
  return { deps, handle: createHandler(deps) }
}

function post(body: unknown, token = 'good-token'): Request {
  return new Request('https://example.test/functions/v1/study-assistant', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('study-assistant function', () => {
  it('returns a checked plan from the AI for a signed-in user', async () => {
    const { deps, handle } = setup()
    const res = await handle(post(request))

    expect(res.status).toBe(200)
    expect(await read(res)).toEqual({ plan, model: 'gemini-flash-latest' })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(deps.claimRequest).toHaveBeenCalledOnce()

    // The AI call: right endpoint, key in a header, and only the validated request data.
    const [url, init] = vi.mocked(deps.fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe(geminiUrl('gemini-flash-latest'))
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent')
    expect(url).not.toContain(SECRET) // the key goes in a header, never the URL
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(SECRET)
    const sent = JSON.parse(init.body as string)
    expect(sent.systemInstruction.parts[0].text).toBe(SYSTEM_PROMPT)
    expect(sent.generationConfig.responseMimeType).toBe('application/json')
    expect(sent.contents[0].parts[0].text).toContain(JSON.stringify(request))
  })

  it('answers the browser preflight (CORS) without doing any work', async () => {
    const { deps, handle } = setup()
    const res = await handle(new Request('https://example.test', { method: 'OPTIONS' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('authorization')
    expect(deps.getUserId).not.toHaveBeenCalled()
  })

  it('rejects requests without a valid sign-in', async () => {
    const { deps, handle } = setup()
    const noHeader = new Request('https://example.test', { method: 'POST', body: JSON.stringify(request) })

    expect((await handle(noHeader)).status).toBe(401)
    const res = await handle(post(request, 'expired-token'))
    expect(res.status).toBe(401)
    expect((await read(res)).error?.code).toBe('unauthorized')
    expect(deps.fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['not JSON', '{oops'],
    ['an unexpected field (no extra data accepted)', { ...request, email: 'student@example.com' }],
    ['too many assignments', { ...request, assignments: Array.from({ length: 21 }, (_, i) => ({ ...request.assignments[0], ref: `A${i + 1}` })) }],
    ['an over-long title', { ...request, assignments: [{ ...request.assignments[0], title: 'x'.repeat(201) }] }],
    ['a badly formatted date', { ...request, now: '18/10/2026' }],
  ])('rejects a request with %s, before calling the AI', async (_label, body) => {
    const { deps, handle } = setup()
    const res = await handle(post(body))
    expect(res.status).toBe(400)
    expect((await read(res)).error?.code).toBe('invalid_request')
    expect(deps.claimRequest).not.toHaveBeenCalled()
    expect(deps.fetch).not.toHaveBeenCalled()
  })

  it('rejects an oversized body without parsing it', async () => {
    const { handle } = setup()
    expect((await handle(post('x'.repeat(60_001)))).status).toBe(413)
  })

  it('says "not configured" when no AI key is set', async () => {
    const { deps, handle } = setup({ apiKey: undefined })
    const res = await handle(post(request))
    expect(res.status).toBe(503)
    expect((await read(res)).error?.code).toBe('not_configured')
    expect(deps.fetch).not.toHaveBeenCalled()
  })

  it('enforces the daily limit', async () => {
    const { deps, handle } = setup({ claimRequest: vi.fn(async () => false) })
    const res = await handle(post(request))
    expect(res.status).toBe(429)
    expect((await read(res)).error?.code).toBe('rate_limited')
    expect(deps.fetch).not.toHaveBeenCalled()
  })

  it('explains a missing usage-limit migration instead of calling the AI unprotected', async () => {
    const { deps, handle } = setup({
      claimRequest: vi.fn(async () => {
        throw new Error('function public.claim_assistant_request() does not exist')
      }),
    })
    const res = await handle(post(request))
    expect(res.status).toBe(503)
    expect((await read(res)).error?.code).toBe('not_configured')
    expect(deps.fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['the AI service errors', async () => new Response('{"error":{"message":"overloaded"}}', { status: 529 })],
    ['the AI service is unreachable', async () => Promise.reject(new TypeError('fetch failed'))],
    ['the answer has the wrong shape', async () => aiReply({ summary: 'Hi', suggestions: [] })],
    ['the answer is not JSON', async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Sure!' }] } }] }))],
    ['the answer was blocked (no candidates)', async () => new Response(JSON.stringify({ promptFeedback: { blockReason: 'OTHER' } }))],
  ])('returns a general error when %s', async (_label, fakeFetch) => {
    const { deps, handle } = setup({ fetch: vi.fn(fakeFetch) as unknown as typeof fetch })
    const res = await handle(post(request))
    expect(res.status).toBe(502)
    const body = await read(res)
    expect(body.error?.code).toBe('ai_unavailable')
    expect(JSON.stringify(body)).not.toContain('overloaded') // upstream details stay in the server log
    expect(deps.log).toHaveBeenCalled()
  })

  it('never includes the secret key in any response or log', async () => {
    const scenarios: Partial<HandlerDeps>[] = [
      {},
      { fetch: vi.fn(async () => new Response('bad key', { status: 401 })) as unknown as typeof fetch },
      { fetch: vi.fn(async () => aiReply({ nope: true })) as unknown as typeof fetch },
    ]
    for (const overrides of scenarios) {
      const { deps, handle } = setup(overrides)
      const res = await handle(post(request))
      expect(await res.text()).not.toContain(SECRET)
      expect(JSON.stringify(vi.mocked(deps.log).mock.calls)).not.toContain(SECRET)
    }
  })

  it("explains the free tier's per-minute limit", async () => {
    const { handle } = setup({ fetch: vi.fn(async () => new Response('{"error":{"status":"RESOURCE_EXHAUSTED"}}', { status: 429 })) as unknown as typeof fetch })
    const res = await handle(post(request))
    expect(res.status).toBe(502)
    expect((await read(res)).error?.message).toMatch(/free AI quota/)
  })

  it('asks Gemini for JSON in the plan shape', () => {
    const { generationConfig } = buildModelRequest(request)
    expect(generationConfig.responseSchema.required).toEqual(['summary', 'suggestions'])
    expect(Object.keys(generationConfig.responseSchema.properties.suggestions.items.properties)).toEqual(['title', 'detail', 'priority', 'related'])
  })
})

describe('reading the AI answer', () => {
  it('skips "thinking" parts and reads the answer text', () => {
    const response = { candidates: [{ content: { parts: [{ text: 'Let me think…', thought: true }, { text: JSON.stringify(plan) }] } }] }
    expect(extractPlan(response)).toEqual(plan)
  })

  it('tidies small problems instead of throwing the answer away', () => {
    const messy = {
      summary: `  ${'S'.repeat(450)}  `,
      suggestions: Array.from({ length: 8 }, () => ({ title: 'T'.repeat(150), detail: 'Do it.', priority: 'HIGH', related: ['A1', 'not-a-ref', 'E2', 'E3', 'A4', 'A5', 'A6'] })),
    }
    const result = extractPlan(geminiBody(messy))!
    expect(result.summary).toHaveLength(400)
    expect(result.suggestions).toHaveLength(6)
    expect(result.suggestions[0].title).toHaveLength(120)
    expect(result.suggestions[0].title.endsWith('…')).toBe(true)
    expect(result.suggestions[0].priority).toBe('high')
    expect(result.suggestions[0].related).toEqual(['A1', 'E2', 'E3', 'A4', 'A5'])
  })

  it('still rejects answers that are missing required parts', () => {
    expect(extractPlan(geminiBody({ summary: 'Hi' }))).toBeNull()
    expect(extractPlan(geminiBody({ summary: 'Hi', suggestions: [{ title: 'x', priority: 'urgent', detail: 'y', related: [] }] }))).toBeNull()
  })
})
