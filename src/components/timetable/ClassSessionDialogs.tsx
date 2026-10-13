import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormDialog } from '@/components/form/FormDialog'
import { ClassSessionForm } from '@/components/timetable/ClassSessionForm'
import type { ClassSessionEditor } from '@/hooks/useClassSessionEditor'
import { DAYS } from '@/lib/timetable'
import type { ClassSession, Course } from '@/types/database'
import { formatTimeOfDay } from '@/utils/format'

interface ClassSessionDialogsProps {
  editor: ClassSessionEditor
  courses: Course[]
  existingSessions: ClassSession[]
}

/** The add/edit form and delete confirmation, driven by useClassSessionEditor(). */
export function ClassSessionDialogs({ editor, courses, existingSessions }: ClassSessionDialogsProps) {
  const { dialog } = editor
  const formOpen = dialog.kind === 'create' || dialog.kind === 'edit'
  const describe = (s: ClassSession) => {
    const course = courses.find((c) => c.id === s.course_id)
    const day = DAYS.find((d) => d.value === s.day_of_week)?.long
    return `${course?.course_code ?? 'This class'} on ${day}, ${formatTimeOfDay(s.start_time)}–${formatTimeOfDay(s.end_time)}`
  }

  return (
    <>
      <FormDialog
        open={formOpen}
        onOpenChange={(open) => !open && editor.close()}
        title={dialog.kind === 'edit' ? 'Edit class' : 'Add class'}
        description="A weekly class that repeats every week of the semester."
      >
        {formOpen && (
          <ClassSessionForm
            session={dialog.kind === 'edit' ? dialog.item : undefined}
            defaults={dialog.kind === 'create' ? dialog.defaults : undefined}
            courses={courses}
            existingSessions={existingSessions}
            onSaved={editor.handleSaved}
            onCancel={editor.close}
          />
        )}
      </FormDialog>

      <ConfirmDialog
        open={dialog.kind === 'delete'}
        onOpenChange={(open) => !open && editor.close()}
        title="Remove this class?"
        description={
          dialog.kind === 'delete' && (
            <>
              <span className="font-medium text-foreground">{describe(dialog.item)}</span> will be removed from your
              timetable. The course itself is not affected.
            </>
          )
        }
        confirmLabel="Remove class"
        onConfirm={() => (dialog.kind === 'delete' ? editor.confirmDelete(dialog.item) : Promise.resolve())}
      />
    </>
  )
}
