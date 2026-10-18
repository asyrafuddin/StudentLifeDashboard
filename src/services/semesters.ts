import type { SemesterFormValues } from '@/lib/schemas'
import { fetchAllRows } from '@/lib/fetch-all'
import { requireSupabase } from '@/lib/supabase'
import type { Semester } from '@/types/database'

/** Newest first. RLS limits results to the signed-in user's semesters. */
export async function listSemesters(): Promise<Semester[]> {
  return fetchAllRows((from, to) =>
    requireSupabase().from('semesters').select('*').order('start_date', { ascending: false }).order('id').range(from, to),
  )
}

/**
 * The database allows only one current semester per user, so before marking
 * a semester as current, un-mark whichever one is current now.
 */
async function clearCurrentSemester(exceptId?: string): Promise<void> {
  let query = requireSupabase().from('semesters').update({ is_current: false }).eq('is_current', true)
  if (exceptId) query = query.neq('id', exceptId)
  const { error } = await query
  if (error) throw error
}

export async function createSemester(values: SemesterFormValues): Promise<Semester> {
  if (values.is_current) await clearCurrentSemester()
  const { data, error } = await requireSupabase().from('semesters').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateSemester(id: string, values: SemesterFormValues): Promise<Semester> {
  if (values.is_current) await clearCurrentSemester(id)
  const { data, error } = await requireSupabase().from('semesters').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Fails (foreign key error) if the semester still has courses. The UI checks first. */
export async function deleteSemester(id: string): Promise<void> {
  const { error } = await requireSupabase().from('semesters').delete().eq('id', id)
  if (error) throw error
}
