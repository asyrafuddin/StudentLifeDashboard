import { type RecordDialogState, useRecordDialogs } from '@/hooks/useRecordDialogs'
import { deleteCourse } from '@/services/courses'
import type { Course } from '@/types/database'

/**
 * Add / edit / delete dialogs for courses, used by the Courses page and the
 * course detail page. Render <CourseDialogs> with the returned object.
 */

export type CourseDialogState = RecordDialogState<Course, { semesterId?: string }>

interface Options {
  onChanged: () => void
  /** Extra step after a delete, e.g. leaving the deleted course's page. */
  onDeleted?: (course: Course) => void
  initialDialog?: CourseDialogState
}

export function useCourseEditor(options: Options) {
  return useRecordDialogs<Course, { semesterId?: string }>({
    ...options,
    remove: (course) => deleteCourse(course.id),
    deletedMessage: (course) => `Deleted ${course.course_code}`,
  })
}

export type CourseEditor = ReturnType<typeof useCourseEditor>
