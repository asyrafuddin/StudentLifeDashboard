import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/errors'
import { deleteAssignment, setAssignmentStatus } from '@/services/assignments'
import type { Assignment, AssignmentStatus } from '@/types/database'

/**
 * Shared add / edit / delete / complete logic for assignments, used by the
 * Assignments page and the course detail page. Render <AssignmentDialogs>
 * with the returned object to show the dialogs.
 */

export type AssignmentDialogState =
  | { kind: 'closed' }
  | { kind: 'create'; defaultCourseId?: string }
  | { kind: 'edit'; assignment: Assignment }
  | { kind: 'delete'; assignment: Assignment }

interface Options {
  /** Called after any successful change, typically the page's `reload`. */
  onChanged: () => void
  /** Optional instant local update, so ticking a checkbox feels immediate. */
  onStatusChangeLocal?: (id: string, status: AssignmentStatus) => void
  /** Start with a dialog open, e.g. "Add assignment" from a dashboard link. */
  initialDialog?: AssignmentDialogState
}

export function useAssignmentEditor({ onChanged, onStatusChangeLocal, initialDialog }: Options) {
  const [dialog, setDialog] = useState<AssignmentDialogState>(initialDialog ?? { kind: 'closed' })

  const close = () => setDialog({ kind: 'closed' })

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

  const confirmDelete = async (assignment: Assignment) => {
    try {
      await deleteAssignment(assignment.id)
      toast.success('Assignment deleted')
      onChanged()
    } catch (error) {
      toast.error(getErrorMessage(error))
      throw error // keeps the confirm dialog open
    }
  }

  const handleSaved = () => {
    close()
    onChanged()
  }

  return {
    dialog,
    close,
    openCreate: (defaultCourseId?: string) => setDialog({ kind: 'create', defaultCourseId }),
    openEdit: (assignment: Assignment) => setDialog({ kind: 'edit', assignment }),
    openDelete: (assignment: Assignment) => setDialog({ kind: 'delete', assignment }),
    toggleComplete,
    confirmDelete,
    handleSaved,
  }
}

export type AssignmentEditor = ReturnType<typeof useAssignmentEditor>
