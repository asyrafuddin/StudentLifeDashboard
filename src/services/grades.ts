import type { CourseResultFormValues, GradeEntryFormValues, GradeScaleEntryFormValues } from '@/lib/schemas'
import { requireSupabase } from '@/lib/supabase'
import type { CourseResult, GradeEntry, GradeScaleEntry } from '@/types/database'

// ---------------------------------------------------------------------------
// Assessment scores (grade_entries)
// ---------------------------------------------------------------------------

export async function listGradeEntries(courseId?: string): Promise<GradeEntry[]> {
  let query = requireSupabase().from('grade_entries').select('*').order('created_at')
  if (courseId) query = query.eq('course_id', courseId)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createGradeEntry(courseId: string, values: GradeEntryFormValues): Promise<GradeEntry> {
  const { data, error } = await requireSupabase()
    .from('grade_entries')
    .insert({ ...values, course_id: courseId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGradeEntry(id: string, values: GradeEntryFormValues): Promise<GradeEntry> {
  const { data, error } = await requireSupabase().from('grade_entries').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteGradeEntry(id: string): Promise<void> {
  const { error } = await requireSupabase().from('grade_entries').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Final course grades (course_results: at most one per course)
// ---------------------------------------------------------------------------

export async function listCourseResults(courseId?: string): Promise<CourseResult[]> {
  let query = requireSupabase().from('course_results').select('*')
  if (courseId) query = query.eq('course_id', courseId)
  const { data, error } = await query
  if (error) throw error
  return data
}

/** Creates the course's result, or updates it if one exists ("upsert"). */
export async function saveCourseResult(courseId: string, values: CourseResultFormValues): Promise<CourseResult> {
  const { data, error } = await requireSupabase()
    .from('course_results')
    .upsert({ ...values, course_id: courseId }, { onConflict: 'user_id,course_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCourseResult(courseId: string): Promise<void> {
  const { error } = await requireSupabase().from('course_results').delete().eq('course_id', courseId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Grading scale (grade_scale_entries)
// ---------------------------------------------------------------------------

export async function listGradeScale(): Promise<GradeScaleEntry[]> {
  const { data, error } = await requireSupabase()
    .from('grade_scale_entries')
    .select('*')
    .order('grade_points', { ascending: false })
  if (error) throw error
  return data
}

export async function createGradeScaleEntry(values: GradeScaleEntryFormValues): Promise<GradeScaleEntry> {
  const { data, error } = await requireSupabase().from('grade_scale_entries').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateGradeScaleEntry(id: string, values: GradeScaleEntryFormValues): Promise<GradeScaleEntry> {
  const { data, error } = await requireSupabase().from('grade_scale_entries').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteGradeScaleEntry(id: string): Promise<void> {
  const { error } = await requireSupabase().from('grade_scale_entries').delete().eq('id', id)
  if (error) throw error
}

/**
 * Replaces the whole scale (used by presets): removes the user's current
 * entries, then inserts the new ones. RLS limits the delete to this user's rows.
 */
export async function replaceGradeScale(entries: GradeScaleEntryFormValues[]): Promise<void> {
  const db = requireSupabase()
  // Supabase requires a filter on delete; every row has a letter, so this matches all of the user's rows.
  const { error: deleteError } = await db.from('grade_scale_entries').delete().not('grade_letter', 'is', null)
  if (deleteError) throw deleteError
  const { error } = await db.from('grade_scale_entries').insert(entries)
  if (error) throw error
}
