import { ThemeProvider } from 'next-themes'
import { RouterProvider } from 'react-router/dom'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { Toaster } from '@/components/ui/sonner'
import { usePasswordRecoveryRedirect } from '@/hooks/usePasswordRecoveryRedirect'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { router } from '@/router'

export default function App() {
  usePasswordRecoveryRedirect(router)
  return (
    // Light, dark, or follow the device ("system"). The choice is remembered in this browser.
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey={THEME_STORAGE_KEY} disableTransitionOnChange>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors={false} />
      </AuthProvider>
    </ThemeProvider>
  )
}
