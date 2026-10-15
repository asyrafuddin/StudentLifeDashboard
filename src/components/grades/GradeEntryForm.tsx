import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { FormActions } from '@/components/form/FormActions'
import { FormField } from '@/components/form/FormField'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/errors'
import { formatNumber } from '@/lib/grades'
import { type GradeEntryFormInput, type GradeEntryFormValues, gradeEntrySchema } from '@/lib/schemas'
import { createGradeEntry, updateGradeEntry } from '@/services/grades'
import type { GradeEntry } from '@/types/database'

interface GradeEntryFormProps {
  courseId: string
  entry?: GradeEntry
  onSaved: () => void
  onCancel: () => void
}

const toText = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))

export function GradeEntryForm({ courseId, entry, onSaved, onCancel }: GradeEntryFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GradeEntryFormInput, unknown, GradeEntryFormValues>({
    resolver: zodResolver(gradeEntrySchema),
    defaultValues: {
      assessment_name: entry?.assessment_name ?? '',
      score: toText(entry?.score),
      max_score: toText(entry?.max_score),
      weight_percent: toText(entry?.weight_percent),
    },
  })

  // Live preview of the percentage, so typos are easy to spot.
  const [score, max] = useWatch({ control, name: ['score', 'max_score'] })
  const preview =
    score && max && Number(max) > 0 && !Number.isNaN(Number(score)) ? (Number(score) / Number(max)) * 100 : null

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (entry) await updateGradeEntry(entry.id, values)
      else await createGradeEntry(courseId, values)
      toast.success(entry ? 'Assessment updated' : 'Assessment added')
      onSaved()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField label="Assessment" error={errors.assessment_name?.message}>
        <Input placeholder="e.g. Midterm exam" {...register('assessment_name')} />
      </FormField>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <FormField label="Score" error={errors.score?.message} hint="Leave empty if not graded yet">
          <Input inputMode="decimal" placeholder="e.g. 42" {...register('score')} />
        </FormField>
        <FormField label="Out of" error={errors.max_score?.message}>
          <Input inputMode="decimal" placeholder="e.g. 50" {...register('max_score')} />
        </FormField>
        <FormField label="Weight (%)" error={errors.weight_percent?.message} hint="Share of the course grade">
          <Input inputMode="decimal" placeholder="e.g. 30" {...register('weight_percent')} />
        </FormField>
      </div>
      {preview !== null && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          That's <span className="font-medium text-foreground">{formatNumber(preview)}%</span>
          {preview > 100 && ' (includes bonus marks)'}.
        </p>
      )}
      <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={entry ? 'Save changes' : 'Add assessment'} />
    </form>
  )
}
