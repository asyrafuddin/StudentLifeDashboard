/**
 * Supabase Edge Function: study-assistant (runs on Supabase's servers, in Deno).
 *
 * This file only connects the handler to Supabase. The logic is in handler.ts.
 * Secrets come from `supabase secrets set ...` and never reach the browser.
 * See docs/ai-assistant.md for setup.
 */
import { createClient } from '@supabase/supabase-js'
import { createHandler } from './handler.ts'
import { DEFAULT_MODEL } from './prompt.ts'

// Provided automatically by Supabase to every Edge Function.
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

/**
 * A client that acts AS the caller: their sign-in token goes with every
 * request, so database rules (RLS, auth.uid()) apply to them as usual.
 * The powerful service-role key is not used anywhere in this function.
 */
function clientFor(authHeader: string) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

Deno.serve(
  createHandler({
    apiKey: Deno.env.get('GEMINI_API_KEY') || undefined,
    model: Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL,
    getUserId: async (authHeader) => {
      const token = authHeader.replace(/^Bearer\s+/i, '')
      const { data, error } = await clientFor(authHeader).auth.getUser(token)
      return error || !data.user ? null : data.user.id
    },
    claimRequest: async (authHeader) => {
      const { data, error } = await clientFor(authHeader).rpc('claim_assistant_request')
      if (error) throw error
      return data === true
    },
    fetch,
    log: (message, details) => console.error(`[study-assistant] ${message}`, details ?? ''),
  }),
)
