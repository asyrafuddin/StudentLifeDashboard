import { Loader2 } from 'lucide-react'
import { useCallback } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CourseForm } from '@/components/courses/CourseForm'
import { FormDialog } from '@/components/form/FormDialog'
import { useAsync } from '@/hooks/useAsync'
import type { CourseEditor } from '@/hooks/useCourseEditor'
import { describeCourseDeletion } from '@/lib/courses'
import { getCourseRelatedCounts } from '@/services/courses'
import type { Course, Semester } from '@/types/database'

interface CourseDialogsProps {
  editor: CourseEditor
  semesters: Semester[]
  existingCourseCount: number
}

/** The add/edit form and delete confirmation, driven by useCourseEditor(). */
export function CourseDialogs({ editor, semesters, existingCourseCount }: CourseDialogsProps) {
  const { dialog } = editor
  const formOpen = dialog.kind === 'create' || dialog.kind === 'edit'

  return (
    <>
      <FormDialog
        open={formOpen}
        onOpenChange={(open) => !open && editor.close()}
        title={dialog.kind === 'edit' ? 'Edit course' : 'Add course'}
      >
        {formOpen && (
          <CourseForm
            course={dialog.kind === 'edit' ? dialog.item : undefined}
            defaultSemesterId={dialog.kind === 'create' ? dialog.defaults?.semesterId : undefined}
            semesters={semesters}
            existingCourseCount={existingCourseCount}
            onSaved={editor.handleSaved}
            onCancel={editor.close}
          />
        )}
      </FormDialog>

      {dialog.kind === 'delete' && <DeleteCourseDialog course={dialog.item} editor={editor} />}
    </>
  )
}

/**
 * Explains exactly what will be deleted along with the course. When related
 * records exist, the user must type the course code to confirm.
 */
function DeleteCourseDialog({ course, editor }: { course: Course; editor: CourseEditor }) {
  const loader = useCallback(() => getCourseRelatedCounts(course.id), [course.id])
  const counts = useAsync(loader)
  const impact = counts.status === 'ready' ? describeCourseDeletion(counts.data) : null

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && editor.close()}
      title={`Delete ${course.course_code}?`}
      description={
        <>
          <span className="font-medium text-foreground">
            {course.course_code} · {course.course_name}
          </span>{' '}
          will be permanently deleted. This can't be undone.
        </>
      }
      confirmLabel="Delete course"
      // Until counts load, assume related records exist and require typing.
      requireTypedText={impact && !impact.hasRelatedRecords ? undefined : course.course_code}
      onConfirm={() => editor.confirmDelete(course)}
    >
      <div className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
        {counts.status === 'loading' && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Checking linked records…
          </p>
        )}
        {counts.status === 'error' && (
          <p className="text-destructive">
            Couldn't check linked records ({counts.message}). Anything linked to this course will also be deleted.
          </p>
        )}
        {impact && !impact.hasRelatedRecords && (
          <p className="text-muted-foreground">Nothing else is linked to this course.</p>
        )}
        {impact && impact.deleted.length > 0 && (
          <div>
            <p className="font-medium">Also permanently deleted:</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {impact.deleted.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {impact && impact.unlinked.length > 0 && (
          <p className="mt-2 text-muted-foreground">
            Kept, but no longer linked to a course: {impact.unlinked.join(', ')}.
          </p>
        )}
      </div>
    </ConfirmDialog>
  )
}
