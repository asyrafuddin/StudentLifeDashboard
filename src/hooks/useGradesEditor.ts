import { useState } from 'react'
import { useRecordDialogs } from '@/hooks/useRecordDialogs'
import { deleteGradeEntry } from '@/services/grades'
import type { Course, GradeEntry } from '@/types/database'

/**
 * Dialogs for a course's grades: add / edit / delete assessment scores, and
 * set the final course grade. Render <GradeDialogs> with the returned object.
 */
export function useGradesEditor({ onChanged }: { onChanged: () => void }) {
  const entries = useRecordDialogs<GradeEntry, { courseId: string }>({
    onChanged,
    remove: (entry) => deleteGradeEntry(entry.id),
    deletedMessage: (entry) => `Deleted “${entry.assessment_name}”`,
  })
  /** The course whose final grade is being edited, if the dialog is open. */
  const [resultCourse, setResultCourse] = useState<Course | null>(null)

  return {
    entries,
    resultCourse,
    openResult: (course: Course) => setResultCourse(course),
    closeResult: () => setResultCourse(null),
    handleResultSaved: () => {
      setResultCourse(null)
      onChanged()
    },
  }
}

export type GradesEditor = ReturnType<typeof useGradesEditor>
