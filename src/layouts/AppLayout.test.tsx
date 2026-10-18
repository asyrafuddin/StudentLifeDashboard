// @vitest-environment jsdom
/** Keyboard and screen-reader support in the app shell: skip link, page titles, focus after navigating. */
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { pageTitle } from '@/config/navigation'
import { createEmptyDemoData } from '@/lib/demo-data'
import { routes as lazyRoutes } from '@/router'
import { preloadRoutes, renderRoutes } from '@/test/render'

vi.mock('@/services/dashboard', () => ({ fetchDashboardData: vi.fn(async () => createEmptyDemoData(new Date())) }))
vi.mock('@/services/profile', () => ({ getProfile: vi.fn(async () => null) }))
vi.mock('@/services/grades', () => ({ listGradeScale: vi.fn(async () => []) }))

// Every page already loaded (see preloadRoutes).
const routes = await preloadRoutes(lazyRoutes)

describe('page titles', () => {
  it.each([
    ['/', 'Dashboard · Student Life'],
    ['/assignments', 'Assignments · Student Life'],
    ['/courses/abc-123', 'My Courses · Student Life'],
    ['/settings', 'Settings · Student Life'],
    ['/forgot-password', 'Reset your password · Student Life'],
    ['/somewhere-else', 'Student Life'],
  ])('%s → "%s"', (path, title) => {
    expect(pageTitle(path)).toBe(title)
  })
})

describe('app shell', () => {
  it('starts with a "Skip to main content" link that targets the page content', async () => {
    const { user } = renderRoutes(routes, { url: '/' })
    await screen.findByText(/Let's set up your semester/)
    await user.tab()
    const skip = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#main-content')
    expect(document.getElementById('main-content')?.tagName).toBe('MAIN')
  })

  it('updates the tab title and moves focus to the new page after using the menu', async () => {
    const { user } = renderRoutes(routes, { url: '/' })
    await screen.findByText(/Let's set up your semester/)
    expect(document.title).toBe('Dashboard · Student Life')

    await user.click(screen.getAllByRole('link', { name: 'Settings' })[0])
    expect(await screen.findByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument()
    expect(document.title).toBe('Settings · Student Life')
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
  })
})
