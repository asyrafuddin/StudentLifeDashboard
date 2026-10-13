import { FlaskConical, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useSignOut } from '@/hooks/useSignOut'

/** Bottom of the sidebar: who is signed in, with a sign-out button. */
export function AccountMenu() {
  const auth = useAuth()
  const { signOut, signingOut } = useSignOut()

  if (auth.status === 'demo') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        Demo mode: sample data
      </div>
    )
  }
  if (auth.status !== 'signed_in') return null

  return (
    <div className="flex items-center gap-2 border-t px-1 pt-3">
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={auth.user.email}>
        {auth.user.email}
      </p>
      <Button variant="ghost" size="icon-sm" aria-label="Sign out" title="Sign out" onClick={signOut} disabled={signingOut}>
        <LogOut />
      </Button>
    </div>
  )
}
