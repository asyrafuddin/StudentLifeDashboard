import type { Session, User } from '@supabase/supabase-js'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { AuthContext, type AuthContextValue } from '@/lib/auth-context'

export const TEST_USER = { id: 'user-1', email: 'student@example.com' } as User

export type TestAuthStatus = 'signed_in' | 'signed_out' | 'demo'

function authValue(status: TestAuthStatus): AuthContextValue {
  const signOut = async () => {}
  if (status === 'signed_in') {
    return { status, user: TEST_USER, session: { user: TEST_USER } as Session, signOut }
  }
  return { status, signOut }
}

/** Renders routes with a chosen sign-in state, plus the toast area so messages can be checked. */
export function renderRoutes(routes: RouteObject[], { url = '/', auth = 'signed_in' }: { url?: string; auth?: TestAuthStatus } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  return {
    user: userEvent.setup(),
    router,
    ...render(
      <AuthContext.Provider value={authValue(auth)}>
        <RouterProvider router={router} />
        <Toaster />
      </AuthContext.Provider>,
    ),
  }
}

/**
 * Renders a single page as a signed-in user, inside a router.
 * `path` is the route pattern (e.g. '/courses/:courseId'); `url` is where to start.
 */
export function renderPage(
  page: ReactElement,
  { path = '/', url = path, auth = 'signed_in' }: { path?: string; url?: string; auth?: TestAuthStatus } = {},
) {
  return renderRoutes(
    [
      { path, element: page },
      // Catch-all so navigation away from the page doesn't crash the test.
      { path: '*', element: <p>Navigated away</p> },
    ],
    { url, auth },
  )
}
