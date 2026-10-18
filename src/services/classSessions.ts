import type { ClassSessionFormValues } from '@/lib/schemas'
import { fetchAllRows } from '@/lib/fetch-all'
import { requireSupabase } from '@/lib/supabase'
import type { ClassSession } from '@/types/database'

/** All of the user's class sessions (or one course's), by day then start time. */
export async function listClassSessions(courseId?: string): Promise<ClassSession[]> {
  return fetchAllRows((from, to) => {
    let query = requireSupabase().from('class_sessions').select('*').order('day_of_week').order('start_time').order('id')
    if (courseId) query = query.eq('course_id', courseId)
    return query.range(from, to)
  })
}

export async function createClassSession(values: ClassSessionFormValues): Promise<ClassSession> {
  const { data, error } = await requireSupabase().from('class_sessions').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateClassSession(id: string, values: ClassSessionFormValues): Promise<ClassSession> {
  const { data, error } = await requireSupabase().from('class_sessions').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteClassSession(id: string): Promise<void> {
  const { error } = await requireSupabase().from('class_sessions').delete().eq('id', id)
  if (error) throw error
}
