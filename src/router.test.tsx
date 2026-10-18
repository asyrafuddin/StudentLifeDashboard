// @vitest-environment jsdom
/**
 * Tests the app's REAL route table: which pages signed-out, signed-in and
 * demo users can reach, and the friendly screen shown when a page crashes.
 */
import { screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteError } from '@/components/RouteError'
import { routes } from '@/router'
import { renderRoutes } from '@/test/render'

// The dashboard loads data when it opens; return an empty account.
vi.mock('@/services/dashboard', () => ({
  fetchDashboardData: vi.fn(async () => ({
    profile: { id: 'user-1', display_name: 'Sam', university_name: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    semesters: [],
    courses: [],
    assignments: [],
    exams: [],
    classSessions: [],
    courseResults: [],
    studySessions: [],
  })),
}))

// Pages load on demand. Compiling them for the first time is slow in the test
// runner, so do it once up front; the tests then check behavior, not compile speed.
beforeAll(async () => {
  await Promise.all([import('@/pages/LoginPage'), import('@/pages/DashboardPage'), import('@/pages/NotFoundPage')])
}, 60_000)

beforeEach(() => vi.clearAllMocks())

describe('route protection', () => {
  it('sends signed-out visitors from a private page to sign in', async () => {
    const { router } = renderRoutes(routes, { url: '/grades', auth: 'signed_out' })
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    // Remembers where they were going, to return there after signing in.
    expect(router.state.location.state).toEqual({ from: '/grades' })
  })

  it('keeps signed-out visitors away from every private page', async () => {
    for (const url of ['/', '/courses', '/assignments', '/exams', '/timetable', '/study', '/settings', '/courses/abc']) {
      const { router, unmount } = renderRoutes(routes, { url, auth: 'signed_out' })
      await waitFor(() => expect(router.state.location.pathname, url).toBe('/login'))
      unmount()
    }
  })

  it('sends signed-in users away from the sign-in page to the dashboard', async () => {
    const { router } = renderRoutes(routes, { url: '/login', auth: 'signed_in' })
    expect(await screen.findByText(/Let's set up your semester/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('opens the app directly in demo mode, with sample data clearly labelled', async () => {
    renderRoutes(routes, { url: '/login', auth: 'demo' })
    expect(await screen.findByText(/Demo mode: you're looking at sample data/)).toBeInTheDocument()
  })

  it('shows a friendly page for unknown addresses', async () => {
    renderRoutes(routes, { url: '/no-such-page', auth: 'signed_in' })
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })
})

describe('crash screen', () => {
  function Broken(): never {
    throw new Error('Cannot read properties of undefined')
  }

  it('replaces a crashed page with a calm message, a reload button and details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderRoutes([{ path: '/', element: <Broken />, errorElement: <RouteError /> }])
    expect(await screen.findByRole('heading', { name: 'Something went wrong on this page' })).toBeInTheDocument()
    expect(screen.getByText(/Your saved data is safe/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
    expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument()
  })
})
