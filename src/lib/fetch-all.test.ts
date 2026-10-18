import { describe, expect, it, vi } from 'vitest'
import { fetchAllRows } from '@/lib/fetch-all'

/** A fake table of `total` rows served in ranges, like Supabase's .range(from, to). */
function fakeTable(total: number) {
  const rows = Array.from({ length: total }, (_, i) => i)
  return vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }))
}

describe('fetchAllRows', () => {
  it('collects every row across several pages', async () => {
    const getPage = fakeTable(2350)
    const rows = await fetchAllRows(getPage, 1000)
    expect(rows).toHaveLength(2350)
    expect(rows.at(-1)).toBe(2349)
    expect(getPage.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it('makes one extra request when the total is an exact multiple of the page size', async () => {
    const getPage = fakeTable(2000)
    expect(await fetchAllRows(getPage, 1000)).toHaveLength(2000)
    expect(getPage).toHaveBeenCalledTimes(3) // the third returns 0 rows, which ends the loop
  })

  it('handles an empty table with one request', async () => {
    const getPage = fakeTable(0)
    expect(await fetchAllRows(getPage)).toEqual([])
    expect(getPage).toHaveBeenCalledOnce()
  })

  it('throws the database error instead of returning partial data', async () => {
    const getPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [1, 2], error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('timeout') })
    await expect(fetchAllRows(getPage, 2)).rejects.toThrow('timeout')
  })
})
