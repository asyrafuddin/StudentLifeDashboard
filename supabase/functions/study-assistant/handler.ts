/**
 * The study-assistant request handler, step by step:
 *
 *   1. Only signed-in users (checked with Supabase Auth).
 *   2. Check the request against the shared contract; reject anything else.
 *   3. If no AI key is configured, say so (the app then keeps its rule-based plan).
 *   4. Enforce a per-user daily limit, so no one can run up the AI bill.
 *   5. Ask the AI, check its answer has the right shape, and return it.
 *
 * Nothing here writes the student's data: the AI only returns suggestions.
 * Everything Supabase- or Deno-specific is passed in (`deps`), so this file
 * can be tested with fakes (see supabase/tests/study-assistant-function.test.ts).
 */
import {
  type AssistantErrorCode,
  type AssistantResponse,
  assistantRequestSchema,
} from '../_shared/study-assistant-contract.ts'
import { buildModelRequest, extractPlan, geminiUrl } from './prompt.ts'

export interface HandlerDeps {
  /** The AI key, from a server-side secret. Undefined when it isn't set. */
  apiKey: string | undefined
  model: string
  /** The signed-in user's id, or null if the Authorization header isn't a valid session. */
  getUserId: (authHeader: string) => Promise<string | null>
  /** Records one request for the caller; false once they've reached today's limit. */
  claimRequest: (authHeader: string) => Promise<boolean>
  fetch: typeof fetch
  /** Server-side log (visible in the Supabase dashboard), never sent to the browser. */
  log: (message: string, details?: unknown) => void
}

/** Requests bigger than this can't be valid (the contract caps every list). */
const MAX_BODY_CHARS = 60_000
const AI_TIMEOUT_MS = 30_000

// The browser calls this function from the app's own address, so it needs CORS
// headers. Access is controlled by the sign-in check, not by these headers.
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: AssistantResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function fail(status: number, code: AssistantErrorCode, message: string): Response {
  return json(status, { error: { code, message } })
}

export function createHandler(deps: HandlerDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
    if (req.method !== 'POST') return fail(405, 'invalid_request', 'Use POST.')

    // 1. Signed in?
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!/^Bearer\s+\S+$/i.test(authHeader)) return fail(401, 'unauthorized', 'Please sign in.')
    let userId: string | null
    try {
      userId = await deps.getUserId(authHeader)
    } catch (error) {
      deps.log('Auth check failed', error)
      userId = null
    }
    if (!userId) return fail(401, 'unauthorized', 'Your session has expired. Please sign in again.')

    // 2. A valid request?
    const raw = await req.text()
    if (raw.length > MAX_BODY_CHARS) return fail(413, 'invalid_request', 'The request is too large.')
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      return fail(400, 'invalid_request', 'The request is not valid JSON.')
    }
    const parsed = assistantRequestSchema.safeParse(body)
    if (!parsed.success) return fail(400, 'invalid_request', 'The request data is not in the expected format.')

    // 3. Is the AI set up?
    if (!deps.apiKey) {
      return fail(503, 'not_configured', 'AI suggestions are not set up for this app yet.')
    }

    // 4. Within today's limit?
    let allowed: boolean
    try {
      allowed = await deps.claimRequest(authHeader)
    } catch (error) {
      // Most likely the usage-limit migration hasn't been run.
      deps.log('Usage limit check failed', error)
      return fail(503, 'not_configured', "The assistant's database setup is incomplete.")
    }
    if (!allowed) {
      return fail(429, 'rate_limited', "You've reached today's limit for AI suggestions. Try again tomorrow.")
    }

    // 5. Ask the AI.
    let aiResponse: Response
    try {
      aiResponse = await deps.fetch(geminiUrl(deps.model), {
        method: 'POST',
        // The key goes in a header, not the URL, so it can't end up in request logs.
        headers: { 'x-goog-api-key': deps.apiKey, 'content-type': 'application/json' },
        body: JSON.stringify(buildModelRequest(parsed.data)),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      })
    } catch (error) {
      deps.log('AI request failed', error)
      return fail(502, 'ai_unavailable', "The AI service didn't respond. Please try again later.")
    }
    if (!aiResponse.ok) {
      // Details stay in the server log; the browser only gets a general message.
      deps.log(`AI service returned ${aiResponse.status}`, await aiResponse.text().catch(() => ''))
      if (aiResponse.status === 429) {
        // The free tier allows only a few requests per minute (and a daily amount) for the whole app.
        return fail(502, 'ai_unavailable', 'The free AI quota is used up for the moment. Please try again in a minute.')
      }
      return fail(502, 'ai_unavailable', 'The AI service is unavailable right now. Please try again later.')
    }

    const plan = extractPlan(await aiResponse.json().catch(() => null))
    if (!plan) {
      deps.log('AI answer did not match the expected shape')
      return fail(502, 'ai_unavailable', 'The AI gave an answer we could not use. Please try again.')
    }
    return json(200, { plan, model: deps.model })
  }
}
