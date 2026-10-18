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
import { PASSWORD_MIN_LENGTH, type SignUpValues, signUpSchema } from '@/lib/schemas'
import { signUp } from '@/services/auth'

export function SignUpPage() {
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const { needsEmailConfirmation } = await signUp(values)
      // Without email confirmation the user is signed in right away and the
      // PublicOnly guard redirects to the dashboard.
      if (needsEmailConfirmation) setConfirmationSentTo(values.email)
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  if (confirmationSentTo) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-4 text-center">
          <MailCheck className="mb-3 size-8 text-primary" aria-hidden />
          <h1 className="text-lg font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{confirmationSentTo}</span>.
            Open it to activate your account, then sign in.
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
          <h1 className="text-lg">Create your account</h1>
        </CardTitle>
        <CardDescription>Organize your courses, deadlines and grades in one place.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField label="Your name" error={errors.displayName?.message}>
            <Input autoComplete="name" {...register('displayName')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register('email')} />
          </FormField>
          <FormField
            label="Password"
            error={errors.password?.message}
            hint={`At least ${PASSWORD_MIN_LENGTH} characters`}
          >
            <Input type="password" autoComplete="new-password" {...register('password')} />
          </FormField>
          <FormField label="Confirm password" error={errors.confirmPassword?.message}>
            <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
          </FormField>

          {formError && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
