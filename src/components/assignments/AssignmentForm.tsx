import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormActions } from '@/components/form/FormActions'
import { FormField } from '@/components/form/FormField'
import { NativeSelect } from '@/components/form/NativeSelect'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage } from '@/lib/errors'
import { type AssignmentFormInput, type AssignmentFormValues, assignmentSchema } from '@/lib/schemas'
import { createAssignment, updateAssignment } from '@/services/assignments'
import { ASSIGNMENT_PRIORITIES, ASSIGNMENT_STATUSES, type Assignment, type Course } from '@/types/database'
import { PRIORITY_LABELS, STATUS_LABELS } from '@/utils/format'

interface AssignmentFormProps {
  /** Omit to create a new assignment. */
  assignment?: Assignment
  courses: Course[]
  defaultCourseId?: string
  onSaved: (assignment: Assignment) => void
  onCancel: () => void
}

/** Splits a stored timestamp into the local date + time shown in the inputs. */
function toDateAndTime(dueAt: string | null): { due_date: string; due_time: string } {
  if (!dueAt) return { due_date: '', due_time: '' }
  const d = new Date(dueAt)
  return { due_date: format(d, 'yyyy-MM-dd'), due_time: format(d, 'HH:mm') }
}

export function AssignmentForm({ assignment, courses, defaultCourseId, onSaved, onCancel }: AssignmentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormInput, unknown, AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      course_id: assignment?.course_id ?? defaultCourseId ?? courses[0]?.id ?? '',
      title: assignment?.title ?? '',
      description: assignment?.description ?? '',
      ...toDateAndTime(assignment?.due_at ?? null),
      priority: assignment?.priority ?? 'medium',
      status: assignment?.status ?? 'not_started',
      estimated_minutes: assignment?.estimated_minutes ? String(assignment.estimated_minutes) : '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = assignment ? await updateAssignment(assignment.id, values) : await createAssignment(values)
      toast.success(assignment ? 'Assignment updated' : 'Assignment added')
      onSaved(saved)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Title" error={errors.title?.message}>
        <Input placeholder="e.g. Problem set 4" {...register('title')} />
      </FormField>
      <FormField label="Course" error={errors.course_id?.message}>
        <NativeSelect {...register('course_id')}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code} · {c.course_name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Due date" error={errors.due_date?.message} hint="Optional">
          <Input type="date" {...register('due_date')} />
        </FormField>
        <FormField label="Due time" error={errors.due_time?.message} hint="Defaults to 11:59 PM">
          <Input type="time" {...register('due_time')} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Priority" error={errors.priority?.message}>
          <NativeSelect {...register('priority')}>
            {ASSIGNMENT_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Status" error={errors.status?.message}>
          <NativeSelect {...register('status')}>
            {ASSIGNMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Estimate (min)" error={errors.estimated_minutes?.message} hint="Optional">
          <Input inputMode="numeric" placeholder="e.g. 90" {...register('estimated_minutes')} />
        </FormField>
      </div>
      <FormField label="Description" error={errors.description?.message} hint="Optional">
        <Textarea rows={3} {...register('description')} />
      </FormField>
      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        submitLabel={assignment ? 'Save changes' : 'Add assignment'}
      />
    </form>
  )
}
