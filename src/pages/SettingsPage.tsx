import { Loader2, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useSignOut } from '@/hooks/useSignOut'
import { getErrorMessage } from '@/lib/errors'
import { getProfile } from '@/services/profile'
import type { Profile } from '@/types/database'

type ProfileState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; profile: Profile }

export function SettingsPage() {
  const auth = useAuth()

  return (
    <>
      <PageHeader title="Settings" description="Your profile and account." />
      <div className="max-w-2xl space-y-6">
        {auth.status === 'signed_in' ? (
          <>
            <ProfileSection userId={auth.user.id} />
            <AccountSection email={auth.user.email ?? ''} />
          </>
        ) : (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              Settings are saved to your account, so they need Supabase to be connected. You're in demo mode,
              where nothing is saved. See <span className="font-medium text-foreground">docs/supabase-setup.md</span>.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Coming in later stages</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Semester names and start/end dates (Stage 3, with courses)</li>
              <li>Your university's GPA grading scale (Stage 5)</li>
              <li>Light / dark theme (Stage 8)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function ProfileSection({ userId }: { userId: string }) {
  const [state, setState] = useState<ProfileState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    getProfile(userId)
      .then((profile) => {
        if (cancelled) return
        setState(
          profile
            ? { status: 'ready', profile }
            : { status: 'error', message: 'Your profile was not found. Did the database migration run?' },
        )
      })
      .catch((error) => !cancelled && setState({ status: 'error', message: getErrorMessage(error) }))
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How the app greets you and which timezone it uses.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading profile…
          </p>
        )}
        {state.status === 'error' && <p className="text-sm text-destructive">{state.message}</p>}
        {state.status === 'ready' && (
          <ProfileForm profile={state.profile} onSaved={(profile) => setState({ status: 'ready', profile })} />
        )}
      </CardContent>
    </Card>
  )
}

function AccountSection({ email }: { email: string }) {
  const { signOut, signingOut } = useSignOut()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Signed in as <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={signOut} disabled={signingOut}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      </CardContent>
    </Card>
  )
}
