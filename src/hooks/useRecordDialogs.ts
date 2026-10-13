import { useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/errors'

/**
 * The add / edit / delete dialog logic shared by every kind of record
 * (courses, assignments, exams, class sessions):
 *
 *   const editor = useRecordDialogs({ onChanged: reload, remove: deleteExam, deletedMessage: … })
 *   editor.openCreate()      -> show the empty form (optionally with defaults)
 *   editor.openEdit(item)    -> show the form filled in
 *   editor.openDelete(item)  -> show "Are you sure?"
 *
 * `T` is the record type; `Defaults` is what a new form can be pre-filled with
 * (e.g. the course to add an assignment to).
 */

export type RecordDialogState<T, Defaults = undefined> =
  | { kind: 'closed' }
  | { kind: 'create'; defaults?: Defaults }
  | { kind: 'edit'; item: T }
  | { kind: 'delete'; item: T }

export interface RecordDialogOptions<T, Defaults> {
  /** Called after any successful save or delete, typically the page's `reload`. */
  onChanged: () => void
  /** Deletes the record in the database. */
  remove: (item: T) => Promise<void>
  /** Toast text after deleting, e.g. (exam) => `Deleted ${exam.title}`. */
  deletedMessage: (item: T) => string
  /** Extra step after a delete, e.g. leaving the deleted course's page. */
  onDeleted?: (item: T) => void
  /** Start with a dialog open, e.g. "Add exam" from a dashboard link. */
  initialDialog?: RecordDialogState<T, Defaults>
}

export function useRecordDialogs<T, Defaults = undefined>({
  onChanged,
  remove,
  deletedMessage,
  onDeleted,
  initialDialog,
}: RecordDialogOptions<T, Defaults>) {
  const [dialog, setDialog] = useState<RecordDialogState<T, Defaults>>(initialDialog ?? { kind: 'closed' })
  const close = () => setDialog({ kind: 'closed' })

  /** Used by the confirm dialog. Throwing keeps it open so the user can retry. */
  const confirmDelete = async (item: T) => {
    try {
      await remove(item)
      toast.success(deletedMessage(item))
      onDeleted?.(item)
      onChanged()
    } catch (error) {
      toast.error(getErrorMessage(error))
      throw error
    }
  }

  return {
    dialog,
    close,
    openCreate: (defaults?: Defaults) => setDialog({ kind: 'create', defaults }),
    openEdit: (item: T) => setDialog({ kind: 'edit', item }),
    openDelete: (item: T) => setDialog({ kind: 'delete', item }),
    confirmDelete,
    /** Pass to a form's onSaved: closes the dialog and refreshes the page data. */
    handleSaved: () => {
      close()
      onChanged()
    },
  }
}
