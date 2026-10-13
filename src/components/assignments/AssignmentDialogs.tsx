import { AssignmentForm } from '@/components/assignments/AssignmentForm'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormDialog } from '@/components/form/FormDialog'
import type { AssignmentEditor } from '@/hooks/useAssignmentEditor'
import type { Course } from '@/types/database'

/** The add/edit form and delete confirmation, driven by useAssignmentEditor(). */
export function AssignmentDialogs({ editor, courses }: { editor: AssignmentEditor; courses: Course[] }) {
  const { dialog } = editor
  const formOpen = dialog.kind === 'create' || dialog.kind === 'edit'

  return (
    <>
      <FormDialog
        open={formOpen}
        onOpenChange={(open) => !open && editor.close()}
        title={dialog.kind === 'edit' ? 'Edit assignment' : 'Add assignment'}
      >
        {formOpen && (
          <AssignmentForm
            assignment={dialog.kind === 'edit' ? dialog.assignment : undefined}
            defaultCourseId={dialog.kind === 'create' ? dialog.defaultCourseId : undefined}
            courses={courses}
            onSaved={editor.handleSaved}
            onCancel={editor.close}
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={dialog.kind === 'delete'}
        onOpenChange={(open) => !open && editor.close()}
        title="Delete this assignment?"
        description={
          dialog.kind === 'delete' && (
            <>
              <span className="font-medium text-foreground">“{dialog.assignment.title}”</span> will be permanently
              deleted. This can't be undone.
            </>
          )
        }
        confirmLabel="Delete assignment"
        onConfirm={() => (dialog.kind === 'delete' ? editor.confirmDelete(dialog.assignment) : Promise.resolve())}
      />
    </>
  )
}
