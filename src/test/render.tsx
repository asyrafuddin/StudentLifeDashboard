import type { Session, User } from '@supabase/supabase-js'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthContext, type AuthContextValue } from '@/lib/auth-context'

export const TEST_USER = { id: 'user-1', email: 'student@example.com' } as User

const signedIn: AuthContextValue = {
  status: 'signed_in',
  user: TEST_USER,
  session: { user: TEST_USER } as Session,
  signOut: async () => {},
}

/**
 * Renders a page as a signed-in user, inside a router.
 * `path` is the route pattern (e.g. '/courses/:courseId'); `url` is where to start.
 */
export function renderPage(page: ReactElement, { path = '/', url = path }: { path?: string; url?: string } = {}) {
  const router = createMemoryRouter(
    [
      { path, element: page },
      // Catch-all so navigation away from the page doesn't crash the test.
      { path: '*', element: <p>Navigated away</p> },
    ],
    { initialEntries: [url] },
  )
  return {
    user: userEvent.setup(),
    router,
    ...render(
      <AuthContext.Provider value={signedIn}>
        <RouterProvider router={router} />
      </AuthContext.Provider>,
    ),
  }
}
