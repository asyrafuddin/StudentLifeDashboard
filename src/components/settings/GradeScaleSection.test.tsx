// @vitest-environment jsdom
/** Workflow tests for the grading scale in Settings. */
import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GradeScaleSection } from '@/components/settings/GradeScaleSection'
import { renderPage } from '@/test/render'
import type { GradeScaleEntry } from '@/types/database'

const db = vi.hoisted(() => ({ scale: [] as GradeScaleEntry[] }))

vi.mock('@/services/grades', () => ({
  listGradeScale: vi.fn(async () => [...db.scale]),
  createGradeScaleEntry: vi.fn(async (v: Partial<GradeScaleEntry>) => {
    const row = { ...v, id: `s${db.scale.length}` } as GradeScaleEntry
    db.scale.push(row)
    return row
  }),
  updateGradeScaleEntry: vi.fn(),
  deleteGradeScaleEntry: vi.fn(),
  replaceGradeScale: vi.fn(async (entries: Partial<GradeScaleEntry>[]) => {
    db.scale = entries.map((e, i) => ({ ...e, id: `p${i}` }) as GradeScaleEntry)
  }),
}))

const grades = await import('@/services/grades')

beforeEach(() => {
  vi.clearAllMocks()
  db.scale = []
})

describe('Grading scale settings', () => {
  it('starts empty: no scale is assumed', async () => {
    renderPage(<GradeScaleSection />)
    expect(await screen.findByText(/No grades yet/)).toBeInTheDocument()
  })

  it('adds grades one by one, highest first', async () => {
    const { user } = renderPage(<GradeScaleSection />)
    await screen.findByText(/No grades yet/)
    for (const [letter, points] of [['B', '3'], ['A', '4']]) {
      await user.type(screen.getByLabelText('Letter'), letter)
      await user.type(screen.getByLabelText('Grade points'), points)
      await user.click(screen.getByRole('button', { name: 'Add grade' }))
      await waitFor(() => expect(screen.getByLabelText('Letter')).toHaveValue(''))
    }
    expect(grades.createGradeScaleEntry).toHaveBeenCalledWith({ grade_letter: 'A', grade_points: 4 })
    const rows = within(await screen.findByRole('table')).getAllByRole('rowheader')
    expect(rows.map((r) => r.textContent)).toEqual(['A', 'B'])
  })

  it('applies a preset only when chosen, and confirms before replacing an existing scale', async () => {
    db.scale = [{ id: 'x', grade_letter: 'P', grade_points: 1 } as GradeScaleEntry]
    const { user } = renderPage(<GradeScaleSection />)
    await user.click(await screen.findByRole('button', { name: '4.0 scale (A- = 3.67)' }))

    const confirm = await screen.findByRole('alertdialog')
    expect(grades.replaceGradeScale).not.toHaveBeenCalled()
    await user.click(within(confirm).getByRole('button', { name: 'Replace scale' }))

    await waitFor(() => expect(grades.replaceGradeScale).toHaveBeenCalledOnce())
    const entries = vi.mocked(grades.replaceGradeScale).mock.calls[0][0]
    expect(entries).toHaveLength(11)
    expect(entries[1]).toEqual({ grade_letter: 'A-', grade_points: 3.67 })
  })
})
