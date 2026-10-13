import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { FormActions } from '@/components/form/FormActions'
import { FormField } from '@/components/form/FormField'
import { NativeSelect } from '@/components/form/NativeSelect'
import { Input } from '@/components/ui/input'
import type { ClassSessionDefaults } from '@/hooks/useClassSessionEditor'
import { getErrorMessage } from '@/lib/errors'
import { type ClassSessionFormInput, type ClassSessionFormValues, classSessionSchema } from '@/lib/schemas'
import { DAYS, findClashes, minutesToTime, timeToMinutes } from '@/lib/timetable'
import { createClassSession, updateClassSession } from '@/services/classSessions'
import type { ClassSession, Course } from '@/types/database'
import { formatTimeOfDay } from '@/utils/format'

interface ClassSessionFormProps {
  session?: ClassSession
  defaults?: ClassSessionDefaults
  courses: Course[]
  /** All existing sessions, to warn about clashes while the user types. */
  existingSessions: ClassSession[]
  onSaved: (session: ClassSession) => void
  onCancel: () => void
}

const toInputTime = (time: string) => time.slice(0, 5) // "09:00:00" -> "09:00"

export function ClassSessionForm({ session, defaults, courses, existingSessions, onSaved, onCancel }: ClassSessionFormProps) {
  const defaultStart = defaults?.startTime ?? ''
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClassSessionFormInput, unknown, ClassSessionFormValues>({
    resolver: zodResolver(classSessionSchema),
    defaultValues: {
      course_id: session?.course_id ?? defaults?.courseId ?? courses[0]?.id ?? '',
      day_of_week: String(session?.day_of_week ?? defaults?.dayOfWeek ?? 1),
      start_time: session ? toInputTime(session.start_time) : defaultStart,
      // When started from a clicked slot, suggest a one-hour class.
      end_time: session
        ? toInputTime(session.end_time)
        : defaultStart
          ? minutesToTime(Math.min(timeToMinutes(defaultStart) + 60, 23 * 60 + 59))
          : '',
      location: session?.location ?? '',
      instructor: session?.instructor ?? '',
    },
  })

  // Watch the fields that decide clashes, so the warning updates as you type.
  const [day, start, end, courseId] = useWatch({ control, name: ['day_of_week', 'start_time', 'end_time', 'course_id'] })
  const clashes =
    start && end && end > start
      ? findClashes({ id: session?.id, day_of_week: Number(day), start_time: start, end_time: end }, existingSessions)
      : []
  const courseById = (id: string) => courses.find((c) => c.id === id)
  const selectedCourse = courseById(courseId)

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = session ? await updateClassSession(session.id, values) : await createClassSession(values)
      toast.success(session ? 'Class updated' : 'Class added to your timetable')
      onSaved(saved)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Course" error={errors.course_id?.message}>
        <NativeSelect {...register('course_id')}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code} · {c.course_name}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Day" error={errors.day_of_week?.message}>
          <NativeSelect {...register('day_of_week')}>
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.long}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Start time" error={errors.start_time?.message}>
          <Input type="time" {...register('start_time')} />
        </FormField>
        <FormField label="End time" error={errors.end_time?.message}>
          <Input type="time" {...register('end_time')} />
        </FormField>
      </div>

      {clashes.length > 0 && (
        <div role="status" className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">This overlaps with:</p>
            <ul className="mt-0.5">
              {clashes.map((c) => (
                <li key={c.id}>
                  {courseById(c.course_id)?.course_code ?? 'Another class'}, {formatTimeOfDay(c.start_time)}–
                  {formatTimeOfDay(c.end_time)}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">You can still save it; both will be shown.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Location" error={errors.location?.message} hint="Optional">
          <Input placeholder="e.g. Room 2.04" {...register('location')} />
        </FormField>
        <FormField
          label="Instructor"
          error={errors.instructor?.message}
          hint={selectedCourse?.instructor ? `Optional; defaults to ${selectedCourse.instructor}` : 'Optional'}
        >
          <Input placeholder="e.g. lab TA" {...register('instructor')} />
        </FormField>
      </div>

      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={session ? 'Save changes' : 'Add class'} />
    </form>
  )
}
