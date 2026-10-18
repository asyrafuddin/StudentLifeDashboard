// @vitest-environment jsdom
/** The Study Assistant page: rule-based plan by default, optional AI suggestions, and honest fallbacks. */
import { screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StudyPlan } from '@shared/study-assistant-contract'
import { createDemoData, createEmptyDemoData } from '@/lib/demo-data'
import { AssistantPage } from '@/pages/AssistantPage'
import { renderPage } from '@/test/render'

vi.mock('@/services/dashboard', () => ({ fetchDashboardData: vi.fn() }))
vi.mock('@/services/assistant', () => ({ requestAiPlan: vi.fn() }))
const dashboard = await import('@/services/dashboard')
const assistant = await import('@/services/assistant')

const aiPlan: StudyPlan = {
  summary: 'A focused week ahead.',
  suggestions: [
    { title: 'Tackle the overdue lab first', detail: 'One 60-minute session this morning.', priority: 'high', related: ['A1', 'Z9'] },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  // Fixed clock so the demo data (relative to "now") is the same every run. Only Date is faked.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0))
  vi.mocked(dashboard.fetchDashboardData).mockImplementation(async () => createDemoData(new Date()))
})
afterEach(() => vi.useRealTimers())

const getAiButton = () => screen.findByRole('button', { name: 'Get AI suggestions' })

describe('Study Assistant page', () => {
  it('shows a rule-based plan straight away, clearly labelled, without calling the AI', async () => {
    renderPage(<AssistantPage />)
    expect(await screen.findByText('Rule-based suggestions')).toBeInTheDocument()
    expect(screen.getByText(/These are suggestions, not instructions/)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0)
    expect(assistant.requestAiPlan).not.toHaveBeenCalled()
  })

  it('shows AI suggestions when asked, labelled as AI, with links only for real items', async () => {
    vi.mocked(assistant.requestAiPlan).mockResolvedValue({ ok: true, plan: aiPlan, model: 'gemini-flash-latest' })
    const { user } = renderPage(<AssistantPage />)
    await user.click(await getAiButton())

    expect(await screen.findByText('AI-generated suggestions')).toBeInTheDocument()
    expect(screen.getByText('Tackle the overdue lab first')).toBeInTheDocument()
    // The request sent is exactly the summary shown under "What the AI would see".
    const sent = vi.mocked(assistant.requestAiPlan).mock.calls[0][0]
    expect(screen.getByText(/"now":/).textContent).toBe(JSON.stringify(sent, null, 2))
    // "A1" points at a real assignment and becomes a link; the made-up "Z9" is ignored.
    const related = screen.getByRole('list', { name: 'Related items' })
    expect(within(related).getAllByRole('link')).toHaveLength(1)
    expect(within(related).getByRole('link')).toHaveAttribute('href', expect.stringMatching(/^\/courses\//))

    await user.click(screen.getByRole('button', { name: 'Back to the rule-based plan' }))
    expect(screen.getByText('Rule-based suggestions')).toBeInTheDocument()
  })

  it("keeps the rule-based plan and explains why when the AI isn't available", async () => {
    vi.mocked(assistant.requestAiPlan).mockResolvedValue({
      ok: false,
      code: 'not_configured',
      message: 'AI suggestions are not set up for this app yet.',
    })
    const { user } = renderPage(<AssistantPage />)
    await user.click(await getAiButton())

    expect(await screen.findByText('AI suggestions are not set up for this app yet.')).toBeInTheDocument()
    expect(screen.getByText('Showing the rule-based plan instead.')).toBeInTheDocument()
    expect(screen.getByText('Rule-based suggestions')).toBeInTheDocument()
  })

  it('offers only the rule-based plan in demo mode', async () => {
    renderPage(<AssistantPage />, { auth: 'demo' })
    expect(await screen.findByText('Rule-based suggestions')).toBeInTheDocument()
    expect(screen.getByText(/AI suggestions need a real account/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Get AI suggestions' })).not.toBeInTheDocument()
  })

  it('asks for courses first when there are none', async () => {
    vi.mocked(dashboard.fetchDashboardData).mockImplementation(async () => createEmptyDemoData(new Date()))
    renderPage(<AssistantPage />)
    expect(await screen.findByText('Add your courses first')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add a course' })).toHaveAttribute('href', '/courses?new=1')
  })
})
