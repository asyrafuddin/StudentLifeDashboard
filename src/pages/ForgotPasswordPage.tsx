import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { FormField } from '@/components/form/FormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/errors'
import { type ForgotPasswordValues, forgotPasswordSchema } from '@/lib/schemas'
import { requestPasswordReset } from '@/services/auth'

/** Step 1 of a password reset: ask for the email and send a link. */
export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } })

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null)
    try {
      await requestPasswordReset(email)
      setSentTo(email)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  if (sentTo) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-4 text-center">
          <MailCheck className="mb-3 size-8 text-primary" aria-hidden />
          <h1 className="text-lg font-semibold">Check your email</h1>
          {/* Worded so it doesn't reveal whether this email has an account. */}
          <p className="mt-2 text-sm text-muted-foreground">
            If <span className="font-medium text-foreground">{sentTo}</span> has an account, we've sent it a link
            to choose a new password. It can take a few minutes, and may land in spam.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-lg">Reset your password</h1>
        </CardTitle>
        <CardDescription>Enter your account's email and we'll send you a link to choose a new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register('email')} />
          </FormField>

          {formError && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            Send reset link
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
