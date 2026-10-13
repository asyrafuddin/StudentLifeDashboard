import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/errors'

/**
 * Signs out and reports failures as a toast. On success the auth listener sees
 * no session and the route guard redirects to /login, so nothing else is needed.
 */
export function useSignOut() {
  const { signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      toast.error(getErrorMessage(error))
      setSigningOut(false)
    }
  }

  return { signOut: handleSignOut, signingOut }
}
