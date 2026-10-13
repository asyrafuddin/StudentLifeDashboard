import type { ProfileFormValues } from '@/lib/schemas'
import { requireSupabase } from '@/lib/supabase'
import type { Profile } from '@/types/database'

/** The signed-in user's profile. RLS guarantees only their own row is visible. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, values: ProfileFormValues): Promise<Profile> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .update({
      display_name: values.display_name,
      university_name: values.university_name,
      timezone: values.timezone,
    })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
