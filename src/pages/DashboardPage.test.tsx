// @vitest-environment jsdom
/**
 * Dashboard with real (signed-in) data: statistics come from the records,
 * plus the empty state, load errors with retry, and the timezone notice.
 */
import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DashboardData } from '@/lib/dashboard-stats'
import { createDemoData } from '@/lib/demo-data'
import { DashboardPage } from '@/pages/DashboardPage'
import { renderPage } from '@/test/render'

vi.mock('@/services/dashboard', () => ({ fetchDashboardData: vi.fn() }))
const service = await import('@/services/dashboard')

const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

/** Sample records shaped exactly like real ones, with the device's timezone. */
function realData(overrides: Partial<DashboardData> = {}): DashboardData {
  const data = createDemoData(new Date())
  return { ...data, profile: { ...data.profile, display_name: 'Nur Aisyah', timezone: deviceTimezone }, ...overrides }
}

const statCard = (label: string) => screen.getByText(label).closest('[data-slot="card"]') as HTMLElement

beforeEach(() => vi.clearAllMocks())

describe('Dashboard (signed in)', () => {
  it('computes the statistics from the loaded records and has no demo banner', async () => {
    const data = realData()
    vi.mocked(service.fetchDashboardData).mockResolvedValue(data)
    renderPage(<DashboardPage />)

    expect(await screen.findByRole('heading', { name: /, Nur$/ })).toBeInTheDocument()
    expect(screen.queryByText(/Demo mode/)).not.toBeInTheDocument()

    // Expected values, counted independently from the same records.
    const currentCourseIds = new Set(data.courses.filter((c) => c.semester_id === 'demo-sem-current').map((c) => c.id))
    const current = data.assignments.filter((a) => currentCourseIds.has(a.course_id))
    const pending = current.filter((a) => a.status !== 'completed').length
    expect(within(statCard('Courses')).getByText(String(currentCourseIds.size))).toBeInTheDocument()
    expect(within(statCard('Pending assignments')).getByText(String(pending))).toBeInTheDocument()
    expect(within(statCard('Completed')).getByText(String(current.length - pending))).toBeInTheDocument()
    // No finalized grades this semester: honest, not 0.00.
    expect(within(statCard('Semester GPA')).getByText('Insufficient data')).toBeInTheDocument()
  })

  it('guides a brand-new user with an empty state', async () => {
    vi.mocked(service.fetchDashboardData).mockResolvedValue(
      realData({ semesters: [], courses: [], assignments: [], exams: [], classSessions: [], courseResults: [], studySessions: [] }),
    )
    renderPage(<DashboardPage />)
    expect(await screen.findByText("Let's set up your semester")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add your first course' })).toHaveAttribute('href', '/courses?new=1')
  })

  it('shows a load error with a retry that works', async () => {
    vi.mocked(service.fetchDashboardData)
      .mockRejectedValueOnce({ message: 'Failed to fetch' })
      .mockResolvedValueOnce(realData())
    const { user } = renderPage(<DashboardPage />)

    expect(await screen.findByText(/Can't reach the server/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: /, Nur$/ })).toBeInTheDocument()
  })

  it('points out when the profile timezone differs from the device', async () => {
    const data = realData()
    const other = deviceTimezone === 'Pacific/Chatham' ? 'Europe/Oslo' : 'Pacific/Chatham'
    vi.mocked(service.fetchDashboardData).mockResolvedValue({ ...data, profile: { ...data.profile, timezone: other } })
    renderPage(<DashboardPage />)
    expect(await screen.findByText(/your profile says/)).toHaveTextContent(other.replace('_', ' '))
  })
})
