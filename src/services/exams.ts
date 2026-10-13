import type { ExamFormValues } from '@/lib/schemas'
import { requireSupabase } from '@/lib/supabase'
import type { Exam } from '@/types/database'

/** All of the user's exams (or one course's), in chronological order. */
export async function listExams(courseId?: string): Promise<Exam[]> {
  let query = requireSupabase().from('exams').select('*').order('starts_at')
  if (courseId) query = query.eq('course_id', courseId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createExam(values: ExamFormValues): Promise<Exam> {
  const { data, error } = await requireSupabase().from('exams').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateExam(id: string, values: ExamFormValues): Promise<Exam> {
  const { data, error } = await requireSupabase().from('exams').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await requireSupabase().from('exams').delete().eq('id', id)
  if (error) throw error
}
