import type { AssignmentFormValues } from '@/lib/schemas'
import { fetchAllRows } from '@/lib/fetch-all'
import { requireSupabase } from '@/lib/supabase'
import type { Assignment, AssignmentStatus } from '@/types/database'

/** All of the user's assignments, or only one course's if `courseId` is given. */
export async function listAssignments(courseId?: string): Promise<Assignment[]> {
  return fetchAllRows((from, to) => {
    let query = requireSupabase()
      .from('assignments')
      .select('*')
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('id') // tie-breaker so paging is stable
    if (courseId) query = query.eq('course_id', courseId)
    return query.range(from, to)
  })
}

export async function createAssignment(values: AssignmentFormValues): Promise<Assignment> {
  const { data, error } = await requireSupabase().from('assignments').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateAssignment(id: string, values: AssignmentFormValues): Promise<Assignment> {
  const { data, error } = await requireSupabase().from('assignments').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function setAssignmentStatus(id: string, status: AssignmentStatus): Promise<Assignment> {
  const { data, error } = await requireSupabase().from('assignments').update({ status }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await requireSupabase().from('assignments').delete().eq('id', id)
  if (error) throw error
}
