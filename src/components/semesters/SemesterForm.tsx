import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormActions } from '@/components/form/FormActions'
import { FormField } from '@/components/form/FormField'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/errors'
import { type SemesterFormValues, semesterSchema } from '@/lib/schemas'
import { createSemester, updateSemester } from '@/services/semesters'
import type { Semester } from '@/types/database'

interface SemesterFormProps {
  /** Omit to create a new semester. */
  semester?: Semester
  /** Pre-ticks "current semester" for a user's first semester. */
  defaultIsCurrent?: boolean
  onSaved: (semester: Semester) => void
  onCancel: () => void
}

export function SemesterForm({ semester, defaultIsCurrent = false, onSaved, onCancel }: SemesterFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterSchema),
    defaultValues: {
      name: semester?.name ?? '',
      start_date: semester?.start_date ?? '',
      end_date: semester?.end_date ?? '',
      is_current: semester?.is_current ?? defaultIsCurrent,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = semester ? await updateSemester(semester.id, values) : await createSemester(values)
      toast.success(semester ? 'Semester updated' : 'Semester added')
      onSaved(saved)
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Name" error={errors.name?.message}>
        <Input placeholder="e.g. Fall 2026" {...register('name')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Start date" error={errors.start_date?.message}>
          <Input type="date" {...register('start_date')} />
        </FormField>
        <FormField label="End date" error={errors.end_date?.message}>
          <Input type="date" {...register('end_date')} />
        </FormField>
      </div>
      <Controller
        control={control}
        name="is_current"
        render={({ field }) => (
          <div className="flex items-start gap-2">
            <Checkbox
              id="semester-is-current"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              className="mt-0.5"
            />
            <div className="grid gap-0.5">
              <Label htmlFor="semester-is-current">This is my current semester</Label>
              <p className="text-xs text-muted-foreground">The dashboard opens on this semester. Only one can be current.</p>
            </div>
          </div>
        )}
      />
      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={semester ? 'Save changes' : 'Add semester'} />
    </form>
  )
}
