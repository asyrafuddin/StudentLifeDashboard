import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * The single Supabase client used across the app.
 *
 * It only uses the PUBLIC anon key. That's safe in the browser because Row
 * Level Security in the database decides what each signed-in user can access.
 * Never put the service-role key here.
 *
 * If the environment variables are missing, `supabase` is null and the app
 * runs in demo mode with sample data instead of crashing.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!)
  : null

/** Use inside code paths that only run when Supabase is configured. */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.')
  }
  return supabase
}
