import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormActions } from '@/components/form/FormActions'
import { FormField } from '@/components/form/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/errors'
import { type GradeScaleEntryFormInput, type GradeScaleEntryFormValues, gradeScaleEntrySchema } from '@/lib/schemas'
import { createGradeScaleEntry, updateGradeScaleEntry } from '@/services/grades'
import type { GradeScaleEntry } from '@/types/database'

interface GradeScaleEntryFormProps {
  /** Omit to add a new grade (shown inline under the table). */
  entry?: GradeScaleEntry
  onSaved: () => void
  /** Only for the edit dialog. */
  onCancel?: () => void
}

export function GradeScaleEntryForm({ entry, onSaved, onCancel }: GradeScaleEntryFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<GradeScaleEntryFormInput, unknown, GradeScaleEntryFormValues>({
    resolver: zodResolver(gradeScaleEntrySchema),
    defaultValues: { grade_letter: entry?.grade_letter ?? '', grade_points: entry ? String(entry.grade_points) : '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (entry) {
        await updateGradeScaleEntry(entry.id, values)
        toast.success('Grade updated')
      } else {
        await createGradeScaleEntry(values)
        // Ready for the next one: quick to type a whole scale in a row.
        reset({ grade_letter: '', grade_points: '' })
        setFocus('grade_letter')
      }
      onSaved()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  if (entry) {
    return (
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Letter" error={errors.grade_letter?.message}>
            <Input {...register('grade_letter')} />
          </FormField>
          <FormField label="Grade points" error={errors.grade_points?.message}>
            <Input inputMode="decimal" {...register('grade_points')} />
          </FormField>
        </div>
        <FormActions onCancel={onCancel ?? (() => {})} isSubmitting={isSubmitting} submitLabel="Save changes" />
      </form>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-start gap-2">
      <div className="w-24">
        <FormField label="Letter" error={errors.grade_letter?.message}>
          <Input placeholder="e.g. B+" {...register('grade_letter')} />
        </FormField>
      </div>
      <div className="w-28">
        <FormField label="Grade points" error={errors.grade_points?.message}>
          <Input inputMode="decimal" placeholder="e.g. 3.33" {...register('grade_points')} />
        </FormField>
      </div>
      <Button type="submit" variant="outline" className="mt-5.5" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
        Add grade
      </Button>
    </form>
  )
}
