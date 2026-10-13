import { addDays, addHours, format, startOfDay, subDays } from 'date-fns'
import type { DashboardData } from '@/lib/dashboard-stats'
import type {
  Assignment,
  AssignmentPriority,
  AssignmentStatus,
  ClassSession,
  Course,
  CourseResult,
  DayOfWeek,
  Exam,
  StudySession,
} from '@/types/database'

/**
 * SAMPLE DATA for demo mode only. Nothing here is saved anywhere.
 *
 * Dates are generated relative to `now` so the demo always shows realistic
 * "upcoming" and "overdue" items no matter when you open it.
 */

const USER_ID = 'demo-user'

export function createDemoData(now: Date): DashboardData {
  const stamp = subDays(now, 30).toISOString()
  const iso = (d: Date) => d.toISOString()
  const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

  const semesters = [
    {
      id: 'demo-sem-current',
      user_id: USER_ID,
      name: 'Current semester (demo)',
      start_date: ymd(subDays(now, 45)),
      end_date: ymd(addDays(now, 75)),
      is_current: true,
      created_at: stamp,
    },
    {
      id: 'demo-sem-previous',
      user_id: USER_ID,
      name: 'Previous semester (demo)',
      start_date: ymd(subDays(now, 230)),
      end_date: ymd(subDays(now, 110)),
      is_current: false,
      created_at: stamp,
    },
  ]

  const course = (
    id: string,
    semester_id: string,
    course_code: string,
    course_name: string,
    instructor: string,
    credits: number,
    color: string,
  ): Course => ({
    id,
    user_id: USER_ID,
    semester_id,
    course_code,
    course_name,
    instructor,
    credits,
    color,
    created_at: stamp,
    updated_at: stamp,
  })

  const courses: Course[] = [
    course('demo-cs201', 'demo-sem-current', 'CS201', 'Data Structures', 'Dr. Rivera', 3, '#6366f1'),
    course('demo-math210', 'demo-sem-current', 'MATH210', 'Linear Algebra', 'Prof. Chen', 3, '#0ea5e9'),
    course('demo-phys101', 'demo-sem-current', 'PHYS101', 'Physics I', 'Dr. Okafor', 4, '#f59e0b'),
    course('demo-eng150', 'demo-sem-current', 'ENG150', 'Academic Writing', 'Ms. Patel', 2, '#10b981'),
    course('demo-cs101', 'demo-sem-previous', 'CS101', 'Intro to Programming', 'Dr. Rivera', 3, '#8b5cf6'),
    course('demo-math101', 'demo-sem-previous', 'MATH101', 'Calculus I', 'Prof. Novak', 4, '#ec4899'),
    course('demo-hist120', 'demo-sem-previous', 'HIST120', 'World History', 'Dr. Haddad', 3, '#64748b'),
  ]

  let n = 0
  const assignment = (
    course_id: string,
    title: string,
    dueInHours: number,
    priority: AssignmentPriority,
    status: AssignmentStatus,
    estimated_minutes: number | null,
  ): Assignment => ({
    id: `demo-assignment-${++n}`,
    user_id: USER_ID,
    course_id,
    title,
    description: null,
    due_at: iso(addHours(now, dueInHours)),
    priority,
    status,
    estimated_minutes,
    created_at: stamp,
    updated_at: stamp,
  })

  const assignments: Assignment[] = [
    assignment('demo-phys101', 'Lab report: projectile motion', -20, 'high', 'in_progress', 120),
    assignment('demo-cs201', 'Problem set 4: linked lists', 18, 'high', 'in_progress', 180),
    assignment('demo-eng150', 'Essay outline', 40, 'medium', 'not_started', 60),
    assignment('demo-math210', 'Homework 5: eigenvalues', 96, 'medium', 'not_started', 90),
    assignment('demo-cs201', 'Project milestone 1', 7 * 24, 'high', 'not_started', 300),
    assignment('demo-eng150', 'Annotated bibliography', 12 * 24, 'low', 'not_started', 120),
    assignment('demo-cs201', 'Problem set 3: stacks & queues', -6 * 24, 'medium', 'completed', 150),
    assignment('demo-math210', 'Homework 4: determinants', -4 * 24, 'medium', 'completed', 90),
    assignment('demo-phys101', 'Problem set 2: kinematics', -9 * 24, 'medium', 'completed', 100),
    assignment('demo-eng150', 'Reading response 1', -14 * 24, 'low', 'completed', 45),
  ]

  const exam = (
    id: string,
    course_id: string,
    title: string,
    exam_type: string,
    daysAhead: number,
    hour: number,
    location: string,
  ): Exam => ({
    id,
    user_id: USER_ID,
    course_id,
    title,
    exam_type,
    starts_at: iso(addHours(startOfDay(addDays(now, daysAhead)), hour)),
    location,
    notes: null,
    created_at: stamp,
    updated_at: stamp,
  })

  const exams: Exam[] = [
    exam('demo-exam-1', 'demo-math210', 'Midterm exam', 'Midterm', 3, 10, 'Hall B, Room 204'),
    exam('demo-exam-2', 'demo-cs201', 'Quiz 3', 'Quiz', 9, 14, 'Engineering 1.12'),
    exam('demo-exam-3', 'demo-phys101', 'Midterm exam', 'Midterm', 20, 9, 'Science Auditorium'),
    exam('demo-exam-4', 'demo-cs201', 'Quiz 2', 'Quiz', -12, 14, 'Engineering 1.12'),
  ]

  const session = (
    id: string,
    course_id: string,
    day_of_week: DayOfWeek,
    start_time: string,
    end_time: string,
    location: string,
  ): ClassSession => ({
    id,
    user_id: USER_ID,
    course_id,
    day_of_week,
    start_time,
    end_time,
    location,
    instructor: null,
    created_at: stamp,
    updated_at: stamp,
  })

  const classSessions: ClassSession[] = [
    session('demo-class-1', 'demo-cs201', 1, '09:00:00', '10:30:00', 'Engineering 1.12'),
    session('demo-class-2', 'demo-math210', 1, '13:00:00', '14:30:00', 'Hall B, Room 110'),
    session('demo-class-3', 'demo-phys101', 2, '08:30:00', '10:00:00', 'Science 2.04'),
    session('demo-class-4', 'demo-eng150', 2, '11:00:00', '12:00:00', 'Humanities 305'),
    session('demo-class-5', 'demo-phys101', 2, '14:00:00', '16:00:00', 'Physics Lab A'),
    session('demo-class-6', 'demo-cs201', 3, '09:00:00', '10:30:00', 'Engineering 1.12'),
    session('demo-class-7', 'demo-math210', 3, '13:00:00', '14:30:00', 'Hall B, Room 110'),
    session('demo-class-8', 'demo-phys101', 4, '08:30:00', '10:00:00', 'Science 2.04'),
    session('demo-class-9', 'demo-eng150', 4, '11:00:00', '12:00:00', 'Humanities 305'),
    session('demo-class-10', 'demo-cs201', 5, '10:00:00', '11:30:00', 'Computer Lab 3'),
  ]

  // Previous semester has finalized grades; the current one has none yet,
  // so the dashboard correctly shows "Insufficient data" for it.
  const result = (course_id: string, letter: string, points: number): CourseResult => ({
    id: `demo-result-${course_id}`,
    user_id: USER_ID,
    course_id,
    final_grade_letter: letter,
    final_grade_points: points,
    is_finalized: true,
    updated_at: stamp,
  })

  const courseResults: CourseResult[] = [
    result('demo-cs101', 'A', 4.0),
    result('demo-math101', 'B+', 3.3),
    result('demo-hist120', 'A-', 3.7),
  ]

  // One evening study session per day for the last 10 days.
  const studyPattern: Array<[string | null, number]> = [
    ['demo-cs201', 95],
    ['demo-math210', 60],
    [null, 30],
    ['demo-phys101', 80],
    ['demo-eng150', 45],
    ['demo-cs201', 120],
    ['demo-math210', 50],
    ['demo-phys101', 70],
    ['demo-cs201', 40],
    ['demo-eng150', 65],
  ]
  const studySessions: StudySession[] = studyPattern
    .map(([course_id, minutes], i): StudySession => {
      const started = addHours(startOfDay(subDays(now, i)), 19)
      return {
        id: `demo-study-${i}`,
        user_id: USER_ID,
        course_id,
        started_at: iso(started),
        ended_at: iso(addHours(started, minutes / 60)),
        duration_seconds: minutes * 60,
        notes: null,
        created_at: iso(started),
      }
    })
    // Don't show sessions that would end in the future.
    .filter((s) => new Date(s.ended_at!) <= now)

  return {
    profile: {
      id: USER_ID,
      display_name: 'Demo Student',
      university_name: null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      created_at: stamp,
      updated_at: stamp,
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

/** Same profile and semesters, but no courses or activity — shows empty states. */
export function createEmptyDemoData(now: Date): DashboardData {
  const full = createDemoData(now)
  return {
    ...full,
    semesters: full.semesters.filter((s) => s.is_current),
    courses: [],
    assignments: [],
    exams: [],
    classSessions: [],
    courseResults: [],
    studySessions: [],
  }
}
