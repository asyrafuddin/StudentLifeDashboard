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
import { EXAM_TYPE_SUGGESTIONS } from '@/lib/exams'
import { type ExamFormInput, type ExamFormValues, examSchema } from '@/lib/schemas'
import { createExam, updateExam } from '@/services/exams'
import type { Course, Exam } from '@/types/database'

interface ExamFormProps {
  exam?: Exam
  courses: Course[]
  defaultCourseId?: string
  onSaved: (exam: Exam) => void
  onCancel: () => void
}

export function ExamForm({ exam, courses, defaultCourseId, onSaved, onCancel }: ExamFormProps) {
  const startsAt = exam ? new Date(exam.starts_at) : null
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExamFormInput, unknown, ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      course_id: exam?.course_id ?? defaultCourseId ?? courses[0]?.id ?? '',
      title: exam?.title ?? '',
      exam_type: exam?.exam_type ?? '',
      // No guessed defaults: the student enters the real date and time.
      date: startsAt ? format(startsAt, 'yyyy-MM-dd') : '',
      time: startsAt ? format(startsAt, 'HH:mm') : '',
      location: exam?.location ?? '',
      notes: exam?.notes ?? '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = exam ? await updateExam(exam.id, values) : await createExam(values)
      toast.success(exam ? 'Exam updated' : 'Exam added')
      onSaved(saved)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <FormField label="Title" error={errors.title?.message}>
          <Input placeholder="e.g. Midterm exam" {...register('title')} />
        </FormField>
        <FormField label="Type" error={errors.exam_type?.message} hint="Optional">
          <Input list="exam-type-suggestions" placeholder="e.g. Final" {...register('exam_type')} />
        </FormField>
      </div>
      {/* Suggestions for the Type field; any other text is allowed too. */}
      <datalist id="exam-type-suggestions">
        {EXAM_TYPE_SUGGESTIONS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

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
        <FormField label="Date" error={errors.date?.message}>
          <Input type="date" {...register('date')} />
        </FormField>
        <FormField label="Start time" error={errors.time?.message}>
          <Input type="time" {...register('time')} />
        </FormField>
      </div>

      <FormField label="Location" error={errors.location?.message} hint="Optional">
        <Input placeholder="e.g. Hall B, Room 204" {...register('location')} />
      </FormField>
      <FormField label="Notes" error={errors.notes?.message} hint="Optional: topics covered, allowed materials, …">
        <Textarea rows={3} {...register('notes')} />
      </FormField>

      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={exam ? 'Save changes' : 'Add exam'} />
    </form>
  )
}
