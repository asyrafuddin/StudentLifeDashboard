import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormDialog } from '@/components/form/FormDialog'
import { SemesterForm } from '@/components/semesters/SemesterForm'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getErrorMessage } from '@/lib/errors'
import { deleteSemester } from '@/services/semesters'
import type { Semester } from '@/types/database'

export type SemesterDialogState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; semester: Semester }
  | { kind: 'delete'; semester: Semester; courseCount: number }

interface SemesterDialogsProps {
  state: SemesterDialogState
  onClose: () => void
  /** True when the user has no semesters yet, so the first one is pre-marked current. */
  isFirstSemester: boolean
  onSaved: (semester: Semester) => void
  onDeleted: (semester: Semester) => void
}

export function SemesterDialogs({ state, onClose, isFirstSemester, onSaved, onDeleted }: SemesterDialogsProps) {
  const formOpen = state.kind === 'create' || state.kind === 'edit'

  const handleDelete = async (semester: Semester) => {
    try {
      await deleteSemester(semester.id)
      toast.success(`Deleted ${semester.name}`)
      onDeleted(semester)
    } catch (error) {
      toast.error(getErrorMessage(error))
      throw error
    }
  }

  return (
    <>
      <FormDialog
        open={formOpen}
        onOpenChange={(open) => !open && onClose()}
        title={state.kind === 'edit' ? 'Edit semester' : 'New semester'}
        description="Courses are grouped by semester."
      >
        {formOpen && (
          <SemesterForm
            semester={state.kind === 'edit' ? state.semester : undefined}
            defaultIsCurrent={isFirstSemester}
            onSaved={onSaved}
            onCancel={onClose}
          />
        )}
      </FormDialog>

      {/* A semester with courses can't be deleted (the database blocks it), so explain instead. */}
      {state.kind === 'delete' && state.courseCount > 0 && (
        <AlertDialog open onOpenChange={(open) => !open && onClose()}>
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Can't delete {state.semester.name} yet</AlertDialogTitle>
              <AlertDialogDescription>
                It still has {state.courseCount} {state.courseCount === 1 ? 'course' : 'courses'}. To protect your data,
                delete those courses first, or edit them to move them to another semester.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button onClick={onClose}>OK</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <ConfirmDialog
        open={state.kind === 'delete' && state.courseCount === 0}
        onOpenChange={(open) => !open && onClose()}
        title={state.kind === 'delete' ? `Delete ${state.semester.name}?` : 'Delete semester?'}
        description="This semester has no courses. Deleting it can't be undone."
        confirmLabel="Delete semester"
        onConfirm={() => (state.kind === 'delete' ? handleDelete(state.semester) : Promise.resolve())}
      />
    </>
  )
}
