import type {
  Assignment,
  ClassSession,
  Course,
  CourseResult,
  Exam,
  GradeEntry,
  GradeScaleEntry,
  Profile,
  Semester,
  StudySession,
} from '@/types/database'

/**
 * Describes our tables to the Supabase client so queries are type-checked,
 * e.g. `supabase.from('courses').select()` returns `Course[]`.
 *
 * `Insert` = columns you must provide (the rest have database defaults such as
 * id, user_id = auth.uid(), and timestamps).
 */
// `Flat<T>` copies an interface into a plain object type. supabase-js requires
// that (interfaces don't satisfy its Record<string, unknown> constraint).
type Flat<T> = { [K in keyof T]: T[K] }

type Table<Row, RequiredOnInsert extends keyof Row> = {
  Row: Flat<Row>
  Insert: Flat<Partial<Row> & Pick<Row, RequiredOnInsert>>
  Update: Flat<Partial<Row>>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, 'id'>
      semesters: Table<Semester, 'name' | 'start_date' | 'end_date'>
      courses: Table<Course, 'semester_id' | 'course_code' | 'course_name'>
      assignments: Table<Assignment, 'course_id' | 'title'>
      exams: Table<Exam, 'course_id' | 'title' | 'starts_at'>
      class_sessions: Table<ClassSession, 'course_id' | 'day_of_week' | 'start_time' | 'end_time'>
      grade_entries: Table<GradeEntry, 'course_id' | 'assessment_name'>
      course_results: Table<CourseResult, 'course_id'>
      grade_scale_entries: Table<GradeScaleEntry, 'grade_letter' | 'grade_points'>
      study_sessions: Table<StudySession, 'started_at'>
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
