import { type ReactElement, cloneElement, useId } from 'react'
import { Label } from '@/components/ui/label'

interface FormFieldProps {
  label: string
  /** Validation message from React Hook Form, if any. */
  error?: string
  hint?: string
  /** A single input-like element (Input, select, textarea, …). */
  children: ReactElement<Record<string, unknown>>
}

/**
 * Label + input + hint/error, wired up for accessibility: the label is linked
 * to the input, and screen readers announce the error with the field.
 */
export function FormField({ label, error, hint, children }: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <p id={messageId} className={error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
          {message}
        </p>
      )}
    </div>
  )
}
