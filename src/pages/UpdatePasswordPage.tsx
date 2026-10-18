import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { FormField } from '@/components/form/FormField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/errors'
import { type NewPasswordValues, newPasswordSchema } from '@/lib/schemas'
import { updatePassword } from '@/services/auth'

/**
 * Choose a new password. Reached two ways:
 *  - from the reset email: the link signs the user in for this purpose
 *  - from Settings, while signed in
 * Without a session (e.g. an expired link) there's nothing to update, so the
 * page explains and offers a new link.
 */
export function UpdatePasswordPage() {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return (
      <p role="status" className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Checking your link…
      </p>
    )
  }

  if (auth.status !== 'signed_in') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-4 text-center">
          <KeyRound className="mb-3 size-8 text-muted-foreground" aria-hidden />
          <h1 className="text-lg font-semibold">This link has expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {auth.status === 'demo'
              ? "Passwords need Supabase to be connected. You're in demo mode."
              : 'Password reset links only work once, for a limited time. Request a new one to continue.'}
          </p>
          {auth.status === 'signed_out' && (
            <Button asChild className="mt-6">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="mt-2">
            <Link to="/">Back to the app</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <NewPasswordForm email={auth.user.email ?? ''} />
}

function NewPasswordForm({ email }: { email: string }) {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null)
    try {
      await updatePassword(password)
      toast.success('Password changed')
      navigate('/', { replace: true })
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-lg">Choose a new password</h1>
        </CardTitle>
        <CardDescription>
          For <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {/* Hidden username field helps password managers save the new password for the right account. */}
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <FormField label="New password" error={errors.password?.message} hint="At least 8 characters">
            <Input type="password" autoComplete="new-password" {...register('password')} />
          </FormField>
          <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
            <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
          </FormField>

          {formError && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            Save new password
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="font-medium text-primary hover:underline">
            Cancel
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
