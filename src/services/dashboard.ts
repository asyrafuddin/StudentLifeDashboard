import type { DashboardData } from '@/lib/dashboard-stats'
import { listAssignments } from '@/services/assignments'
import { listClassSessions } from '@/services/classSessions'
import { listCourses } from '@/services/courses'
import { listExams } from '@/services/exams'
import { listCourseResults } from '@/services/grades'
import { getProfile } from '@/services/profile'
import { listSemesters } from '@/services/semesters'
import { listStudySessions } from '@/services/study'

/**
 * Loads everything the dashboard needs, in parallel, using the same list
 * functions as the other pages (so the dashboard gets complete, paged data).
 *
 * There's no `user_id` filter on purpose: Row Level Security already limits
 * every query to the signed-in user's rows.
 */
export async function fetchDashboardData(userId: string, email: string): Promise<DashboardData> {
  const [profile, semesters, courses, assignments, exams, classSessions, courseResults, studySessions] =
    await Promise.all([
      getProfile(userId),
      listSemesters(),
      listCourses(),
      listAssignments(),
      listExams(),
      listClassSessions(),
      listCourseResults(),
      listStudySessions(),
    ])

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
    semesters,
    courses,
    assignments,
    exams,
    classSessions,
    courseResults,
    studySessions,
  }
}
