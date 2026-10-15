import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormActions } from '@/components/form/FormActions'
import { FormField } from '@/components/form/FormField'
import { NativeSelect } from '@/components/form/NativeSelect'
import { CourseOptions } from '@/components/study/CourseOptions'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/errors'
import { type StudyLogFormInput, type StudyLogFormValues, studyLogSchema } from '@/lib/schemas'
import { createStudySession, updateStudySession } from '@/services/study'
import type { Course, Semester, StudySession } from '@/types/database'

interface StudyLogFormProps {
  /** Omit to log a new session. A running session here means "finish it with a real duration". */
  session?: StudySession
  courses: Course[]
  semesters: Semester[]
  onSaved: () => void
  onCancel: () => void
}

/** Log a finished study session by hand, or edit one. */
export function StudyLogForm({ session, courses, semesters, onSaved, onCancel }: StudyLogFormProps) {
  const started = session ? new Date(session.started_at) : null
  // Today's date, captured once when the form opens (not on every re-render).
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudyLogFormInput, unknown, StudyLogFormValues>({
    resolver: zodResolver(studyLogSchema),
    defaultValues: {
      course_id: session?.course_id ?? '',
      // New sessions default to today; the time is left for the user to enter.
      date: started ? format(started, 'yyyy-MM-dd') : today,
      start_time: started ? format(started, 'HH:mm') : '',
      duration_minutes: session?.duration_seconds ? String(Math.round(session.duration_seconds / 60)) : '',
      notes: session?.notes ?? '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (session) await updateStudySession(session.id, values)
      else await createStudySession(values)
      toast.success(session ? 'Study session updated' : 'Study session logged')
      onSaved()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Course" error={errors.course_id?.message} hint="Optional">
        <NativeSelect {...register('course_id')}>
          <CourseOptions courses={courses} semesters={semesters} />
        </NativeSelect>
      </FormField>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <FormField label="Date" error={errors.date?.message}>
          <Input type="date" {...register('date')} />
        </FormField>
        <FormField label="Start time" error={errors.start_time?.message}>
          <Input type="time" {...register('start_time')} />
        </FormField>
        <FormField label="Minutes studied" error={errors.duration_minutes?.message}>
          <Input inputMode="numeric" placeholder="e.g. 45" {...register('duration_minutes')} />
        </FormField>
      </div>
      <FormField label="Notes" error={errors.notes?.message} hint="Optional">
        <Input placeholder="e.g. Reviewed lecture 5" {...register('notes')} />
      </FormField>
      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={session ? 'Save' : 'Log session'} />
    </form>
  )
}
