import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ColorPicker } from '@/components/form/ColorPicker'
import { FormActions } from '@/components/form/FormActions'
import { FormField } from '@/components/form/FormField'
import { NativeSelect } from '@/components/form/NativeSelect'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/errors'
import { COURSE_COLORS, type CourseFormInput, type CourseFormValues, courseSchema } from '@/lib/schemas'
import { createCourse, updateCourse } from '@/services/courses'
import type { Course, Semester } from '@/types/database'

interface CourseFormProps {
  /** Omit to create a new course. */
  course?: Course
  semesters: Semester[]
  defaultSemesterId?: string
  /** Number of existing courses, used to pick a different default color for each new one. */
  existingCourseCount?: number
  onSaved: (course: Course) => void
  onCancel: () => void
}

export function CourseForm({
  course,
  semesters,
  defaultSemesterId,
  existingCourseCount = 0,
  onSaved,
  onCancel,
}: CourseFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormInput, unknown, CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      semester_id: course?.semester_id ?? defaultSemesterId ?? semesters[0]?.id ?? '',
      course_code: course?.course_code ?? '',
      course_name: course?.course_name ?? '',
      instructor: course?.instructor ?? '',
      credits: course ? String(course.credits) : '',
      color: course?.color ?? COURSE_COLORS[existingCourseCount % COURSE_COLORS.length].value,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = course ? await updateCourse(course.id, values) : await createCourse(values)
      toast.success(course ? 'Course updated' : 'Course added')
      onSaved(saved)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <FormField label="Course code" error={errors.course_code?.message}>
          <Input placeholder="e.g. CS201" autoCapitalize="characters" {...register('course_code')} />
        </FormField>
        <FormField label="Course name" error={errors.course_name?.message}>
          <Input placeholder="e.g. Data Structures" {...register('course_name')} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <FormField label="Instructor" error={errors.instructor?.message} hint="Optional">
          <Input {...register('instructor')} />
        </FormField>
        <FormField label="Credits" error={errors.credits?.message}>
          <Input inputMode="decimal" placeholder="e.g. 3" {...register('credits')} />
        </FormField>
      </div>
      <FormField label="Semester" error={errors.semester_id?.message}>
        <NativeSelect {...register('semester_id')}>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <Controller
        control={control}
        name="color"
        render={({ field }) => (
          <FormField label="Color" error={errors.color?.message} hint="Used for this course across the app.">
            <ColorPicker value={field.value} onChange={field.onChange} />
          </FormField>
        )}
      />
      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={course ? 'Save changes' : 'Add course'} />
    </form>
  )
}
