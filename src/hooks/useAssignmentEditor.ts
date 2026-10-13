import { toast } from 'sonner'
import { type RecordDialogState, useRecordDialogs } from '@/hooks/useRecordDialogs'
import { getErrorMessage } from '@/lib/errors'
import { deleteAssignment, setAssignmentStatus } from '@/services/assignments'
import type { Assignment, AssignmentStatus } from '@/types/database'

/**
 * Add / edit / delete / complete for assignments, used by the Assignments page
 * and the course detail page. Render <AssignmentDialogs> with the returned object.
 */

export type AssignmentDialogState = RecordDialogState<Assignment, { courseId?: string }>

interface Options {
  /** Called after any successful change, typically the page's `reload`. */
  onChanged: () => void
  /** Optional instant local update, so ticking a checkbox feels immediate. */
  onStatusChangeLocal?: (id: string, status: AssignmentStatus) => void
  initialDialog?: AssignmentDialogState
}

export function useAssignmentEditor({ onChanged, onStatusChangeLocal, initialDialog }: Options) {
  const dialogs = useRecordDialogs<Assignment, { courseId?: string }>({
    onChanged,
    initialDialog,
    remove: (assignment) => deleteAssignment(assignment.id),
    deletedMessage: () => 'Assignment deleted',
  })

  /**
   * Ticking marks it completed. Unticking moves it back to "In progress",
   * the most likely state for something that was nearly finished.
   */
  const toggleComplete = async (assignment: Assignment) => {
    const next: AssignmentStatus = assignment.status === 'completed' ? 'in_progress' : 'completed'
    onStatusChangeLocal?.(assignment.id, next)
    try {
      await setAssignmentStatus(assignment.id, next)
      if (next === 'completed') toast.success(`Completed “${assignment.title}”`)
      onChanged()
    } catch (error) {
      toast.error(getErrorMessage(error))
      onStatusChangeLocal?.(assignment.id, assignment.status) // undo the local change
    }
  }

  return { ...dialogs, toggleComplete }
}

export type AssignmentEditor = ReturnType<typeof useAssignmentEditor>
