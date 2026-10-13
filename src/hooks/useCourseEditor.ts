import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/errors'
import { deleteCourse } from '@/services/courses'
import type { Course } from '@/types/database'

/**
 * Shared add / edit / delete logic for courses, used by the Courses page and
 * the course detail page. Render <CourseDialogs> with the returned object.
 */

export type CourseDialogState =
  | { kind: 'closed' }
  | { kind: 'create'; defaultSemesterId?: string }
  | { kind: 'edit'; course: Course }
  | { kind: 'delete'; course: Course }

interface Options {
  onChanged: () => void
  /** Extra step after a delete, e.g. leaving the deleted course's page. */
  onDeleted?: (course: Course) => void
  /** Start with a dialog open, e.g. "Add course" from a dashboard link. */
  initialDialog?: CourseDialogState
}

export function useCourseEditor({ onChanged, onDeleted, initialDialog }: Options) {
  const [dialog, setDialog] = useState<CourseDialogState>(initialDialog ?? { kind: 'closed' })
  const close = () => setDialog({ kind: 'closed' })

  const confirmDelete = async (course: Course) => {
    try {
      await deleteCourse(course.id)
      toast.success(`Deleted ${course.course_code}`)
      onDeleted?.(course)
      onChanged()
    } catch (error) {
      toast.error(getErrorMessage(error))
      throw error // keeps the confirm dialog open
    }
  }

  return {
    dialog,
    close,
    openCreate: (defaultSemesterId?: string) => setDialog({ kind: 'create', defaultSemesterId }),
    openEdit: (course: Course) => setDialog({ kind: 'edit', course }),
    openDelete: (course: Course) => setDialog({ kind: 'delete', course }),
    confirmDelete,
    handleSaved: () => {
      close()
      onChanged()
    },
  }
}

export type CourseEditor = ReturnType<typeof useCourseEditor>
