import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ExamForm } from '@/components/exams/ExamForm'
import { FormDialog } from '@/components/form/FormDialog'
import type { ExamEditor } from '@/hooks/useExamEditor'
import type { Course } from '@/types/database'

/** The add/edit form and delete confirmation, driven by useExamEditor(). */
export function ExamDialogs({ editor, courses }: { editor: ExamEditor; courses: Course[] }) {
  const { dialog } = editor
  const formOpen = dialog.kind === 'create' || dialog.kind === 'edit'

  return (
    <>
      <FormDialog
        open={formOpen}
        onOpenChange={(open) => !open && editor.close()}
        title={dialog.kind === 'edit' ? 'Edit exam' : 'Add exam'}
      >
        {formOpen && (
          <ExamForm
            exam={dialog.kind === 'edit' ? dialog.item : undefined}
            defaultCourseId={dialog.kind === 'create' ? dialog.defaults?.courseId : undefined}
            courses={courses}
            onSaved={editor.handleSaved}
            onCancel={editor.close}
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={dialog.kind === 'delete'}
        onOpenChange={(open) => !open && editor.close()}
        title="Delete this exam?"
        description={
          dialog.kind === 'delete' && (
            <>
              <span className="font-medium text-foreground">“{dialog.item.title}”</span> will be permanently deleted.
              This can't be undone.
            </>
          )
        }
        confirmLabel="Delete exam"
        onConfirm={() => (dialog.kind === 'delete' ? editor.confirmDelete(dialog.item) : Promise.resolve())}
      />
    </>
  )
}
