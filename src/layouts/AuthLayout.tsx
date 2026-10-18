import { GraduationCap } from 'lucide-react'
import { Outlet } from 'react-router'
import { usePageTitle } from '@/hooks/usePageTitle'

/** Centered card layout for the sign-in and sign-up pages. */
export function AuthLayout() {
  usePageTitle()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="size-5" aria-hidden />
        </div>
        <span className="text-lg font-semibold tracking-tight">Student Life Dashboard</span>
      </div>
      <main className="w-full max-w-sm">
        <Outlet />
      </main>
    </div>
  )
}
