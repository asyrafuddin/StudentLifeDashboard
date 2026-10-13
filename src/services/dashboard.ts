import type { DashboardData } from '@/lib/dashboard-stats'
import { requireSupabase } from '@/lib/supabase'
import { getProfile } from '@/services/profile'

/**
 * Loads everything the dashboard needs in parallel.
 *
 * There's no `.eq('user_id', …)` filter on purpose: Row Level Security already
 * limits every query to the signed-in user's rows, so filtering here would
 * only duplicate (and could hide bugs in) the database's own security.
 */
export async function fetchDashboardData(userId: string, email: string): Promise<DashboardData> {
  const db = requireSupabase()
  const [profile, semesters, courses, assignments, exams, classSessions, courseResults, studySessions] =
    await Promise.all([
      getProfile(userId),
      db.from('semesters').select('*').order('start_date', { ascending: false }),
      db.from('courses').select('*').order('course_code'),
      db.from('assignments').select('*'),
      db.from('exams').select('*'),
      db.from('class_sessions').select('*'),
      db.from('course_results').select('*'),
      db.from('study_sessions').select('*'),
    ])

  for (const result of [semesters, courses, assignments, exams, classSessions, courseResults, studySessions]) {
    if (result.error) throw result.error
  }

  return {
    // Fallback in case the profile row is missing (e.g. account created before the migration ran).
    profile: profile ?? {
      id: userId,
      display_name: email.split('@')[0],
      university_name: null,
      timezone: 'UTC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    semesters: semesters.data ?? [],
    courses: courses.data ?? [],
    assignments: assignments.data ?? [],
    exams: exams.data ?? [],
    classSessions: classSessions.data ?? [],
    courseResults: courseResults.data ?? [],
    studySessions: studySessions.data ?? [],
  }
}
