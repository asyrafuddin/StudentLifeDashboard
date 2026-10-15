import type { Course, Semester } from '@/types/database'

/**
 * <option>s for picking a course for a study session: "No specific course",
 * then courses grouped by semester (current semester first).
 */
export function CourseOptions({ courses, semesters }: { courses: Course[]; semesters: Semester[] }) {
  const ordered = [...semesters].sort((a, b) => Number(b.is_current) - Number(a.is_current))
  return (
    <>
      <option value="">No specific course</option>
      {ordered.map((s) => {
        const semesterCourses = courses.filter((c) => c.semester_id === s.id)
        if (semesterCourses.length === 0) return null
        return (
          <optgroup key={s.id} label={s.name}>
            {semesterCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code} · {c.course_name}
              </option>
            ))}
          </optgroup>
        )
      })}
    </>
  )
}
