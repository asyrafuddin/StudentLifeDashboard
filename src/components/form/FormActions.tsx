import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FormActionsProps {
  onCancel: () => void
  submitLabel: string
  isSubmitting: boolean
}

/** Cancel + submit buttons at the bottom of a dialog form. */
export function FormActions({ onCancel, submitLabel, isSubmitting }: FormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        {submitLabel}
      </Button>
    </div>
  )
}
