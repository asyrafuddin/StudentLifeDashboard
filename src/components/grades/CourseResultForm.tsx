import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { FormActions } from '@/components/form/FormActions'
import { FormField } from '@/components/form/FormField'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/errors'
import { formatNumber, pointsForLetter, sortScale } from '@/lib/grades'
import { type CourseResultFormInput, type CourseResultFormValues, courseResultSchema } from '@/lib/schemas'
import { deleteCourseResult, saveCourseResult } from '@/services/grades'
import type { Course, CourseResult, GradeScaleEntry } from '@/types/database'

interface CourseResultFormProps {
  course: Course
  result?: CourseResult
  scale: GradeScaleEntry[]
  onSaved: () => void
  onCancel: () => void
}

/**
 * The official final grade for a course, entered by the student: a letter
 * and/or grade points. Picking a letter from the grading scale fills in its
 * points; points can also be typed directly for systems that don't fit a scale.
 */
export function CourseResultForm({ course, result, scale, onSaved, onCancel }: CourseResultFormProps) {
  const [clearing, setClearing] = useState(false)
  const {
    register,
    control,
    handleSubmit,
    setValue,

    formState: { errors, isSubmitting },
  } = useForm<CourseResultFormInput, unknown, CourseResultFormValues>({
    resolver: zodResolver(courseResultSchema),
    defaultValues: {
      final_grade_letter: result?.final_grade_letter ?? '',
      final_grade_points: result?.final_grade_points === null || !result ? '' : String(result.final_grade_points),
      is_finalized: result?.is_finalized ?? false,
    },
  })

  const letterField = register('final_grade_letter')
  // Watched (not read once), so the hint below updates as the user types.
  const pointsText = useWatch({ control, name: 'final_grade_points' })
  const sortedScale = sortScale(scale)

  const onSubmit = handleSubmit(async (values) => {
    try {
      await saveCourseResult(course.id, values)
      toast.success('Final grade saved')
      onSaved()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  })

  const handleClear = async () => {
    setClearing(true)
    try {
      await deleteCourseResult(course.id)
      toast.success('Final grade removed')
      onSaved()
    } catch (error) {
      toast.error(getErrorMessage(error))
      setClearing(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Letter grade"
          error={errors.final_grade_letter?.message}
          hint={scale.length > 0 ? 'Pick from your scale or type one' : 'Optional, e.g. A- or Pass'}
        >
          <Input
            list="grade-scale-letters"
            autoComplete="off"
            {...letterField}
            onChange={(e) => {
              letterField.onChange(e)
              // Picking a letter that's in the scale fills in its points.
              const points = pointsForLetter(scale, e.target.value)
              if (points !== null) setValue('final_grade_points', String(points), { shouldDirty: true })
            }}
          />
        </FormField>
        <FormField label="Grade points" error={errors.final_grade_points?.message} hint="Counts toward GPA">
          <Input inputMode="decimal" placeholder="e.g. 3.67" {...register('final_grade_points')} />
        </FormField>
      </div>
      <datalist id="grade-scale-letters">
        {sortedScale.map((s) => (
          <option key={s.id} value={s.grade_letter}>
            {formatNumber(s.grade_points)} points
          </option>
        ))}
      </datalist>

      {scale.length === 0 && (
        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          No grading scale set up yet, so enter the grade points yourself, or{' '}
          <Link to="/settings#grading-scale" className="font-medium text-primary hover:underline">
            set up your scale
          </Link>{' '}
          to pick letters.
        </p>
      )}

      <Controller
        control={control}
        name="is_finalized"
        render={({ field }) => (
          <div className="flex items-start gap-2">
            <Checkbox
              id="result-finalized"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              className="mt-0.5"
            />
            <div className="grid gap-0.5">
              <Label htmlFor="result-finalized">This is my official final grade</Label>
              <p className="text-xs text-muted-foreground">
                Only finalized grades with grade points count toward your GPA.
                {pointsText.trim() === '' && ' Without points, this course is left out of GPA.'}
              </p>
            </div>
          </div>
        )}
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {result ? (
          <Button type="button" variant="ghost" className="text-destructive" onClick={handleClear} disabled={clearing || isSubmitting}>
            {clearing && <Loader2 className="animate-spin" aria-hidden />}
            Remove final grade
          </Button>
        ) : (
          <span />
        )}
        <FormActions onCancel={onCancel} isSubmitting={isSubmitting} submitLabel="Save final grade" />
      </div>
    </form>
  )
}
