import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormDialog } from '@/components/form/FormDialog'
import { CourseResultForm } from '@/components/grades/CourseResultForm'
import { GradeEntryForm } from '@/components/grades/GradeEntryForm'
import type { GradesEditor } from '@/hooks/useGradesEditor'
import type { CourseResult, GradeScaleEntry } from '@/types/database'

interface GradeDialogsProps {
  editor: GradesEditor
  results: CourseResult[]
  scale: GradeScaleEntry[]
}

/** Assessment add/edit/delete and the final-grade form, driven by useGradesEditor(). */
export function GradeDialogs({ editor, results, scale }: GradeDialogsProps) {
  const { dialog } = editor.entries
  const entryFormOpen = dialog.kind === 'create' || dialog.kind === 'edit'
  const entryCourseId = dialog.kind === 'create' ? dialog.defaults?.courseId : dialog.kind === 'edit' ? dialog.item.course_id : undefined
  const resultCourse = editor.resultCourse

  return (
    <>
      <FormDialog
        open={entryFormOpen}
        onOpenChange={(open) => !open && editor.entries.close()}
        title={dialog.kind === 'edit' ? 'Edit assessment' : 'Add assessment'}
        description="A raw score for one piece of assessed work."
      >
        {entryFormOpen && entryCourseId && (
          <GradeEntryForm
            courseId={entryCourseId}
            entry={dialog.kind === 'edit' ? dialog.item : undefined}
            onSaved={editor.entries.handleSaved}
            onCancel={editor.entries.close}
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={dialog.kind === 'delete'}
        onOpenChange={(open) => !open && editor.entries.close()}
        title="Delete this assessment?"
        description={
          dialog.kind === 'delete' && (
            <>
              <span className="font-medium text-foreground">“{dialog.item.assessment_name}”</span> and its score will be
              permanently deleted.
            </>
          )
        }
        confirmLabel="Delete assessment"
        onConfirm={() => (dialog.kind === 'delete' ? editor.entries.confirmDelete(dialog.item) : Promise.resolve())}
      />

      <FormDialog
        open={resultCourse !== null}
        onOpenChange={(open) => !open && editor.closeResult()}
        title={resultCourse ? `Final grade: ${resultCourse.course_code}` : 'Final grade'}
        description="The official grade on your transcript. This is what your GPA uses."
      >
        {resultCourse && (
          <CourseResultForm
            course={resultCourse}
            result={results.find((r) => r.course_id === resultCourse.id)}
            scale={scale}
            onSaved={editor.handleResultSaved}
            onCancel={editor.closeResult}
          />
        )}
      </FormDialog>
    </>
  )
}
