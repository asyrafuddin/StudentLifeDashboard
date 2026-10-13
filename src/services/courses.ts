import type { CourseRelatedCounts } from '@/lib/courses'
import type { CourseFormValues } from '@/lib/schemas'
import { requireSupabase } from '@/lib/supabase'
import type { Course } from '@/types/database'

export async function listCourses(): Promise<Course[]> {
  const { data, error } = await requireSupabase().from('courses').select('*').order('course_code')
  if (error) throw error
  return data
}

/** Returns null if the course doesn't exist or belongs to someone else (RLS hides it). */
export async function getCourse(id: string): Promise<Course | null> {
  const { data, error } = await requireSupabase().from('courses').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createCourse(values: CourseFormValues): Promise<Course> {
  const { data, error } = await requireSupabase().from('courses').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateCourse(id: string, values: CourseFormValues): Promise<Course> {
  const { data, error } = await requireSupabase().from('courses').update(values).eq('id', id).select().single()
  if (error) throw error
  return data
}

/**
 * Deletes the course. The database also deletes its assignments, exams,
 * timetable classes, grade entries and final result, and unlinks study sessions.
 */
export async function deleteCourse(id: string): Promise<void> {
  const { error } = await requireSupabase().from('courses').delete().eq('id', id)
  if (error) throw error
}

/** Counts linked records, so the delete dialog can explain the consequences. */
export async function getCourseRelatedCounts(courseId: string): Promise<CourseRelatedCounts> {
  const db = requireSupabase()
  // `head: true` asks only for the number of rows, not the rows themselves.
  const count = async (
    table: 'assignments' | 'exams' | 'class_sessions' | 'grade_entries' | 'course_results' | 'study_sessions',
  ) => {
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true }).eq('course_id', courseId)
    if (error) throw error
    return count ?? 0
  }

  const [assignments, exams, classSessions, gradeEntries, courseResults, studySessions] = await Promise.all([
    count('assignments'),
    count('exams'),
    count('class_sessions'),
    count('grade_entries'),
    count('course_results'),
    count('study_sessions'),
  ])
  return { assignments, exams, classSessions, gradeEntries, courseResults, studySessions }
}
