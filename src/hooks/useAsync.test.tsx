// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { REFRESH_AFTER_MS, useAsync } from '@/hooks/useAsync'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const { toast } = await import('sonner')

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

/** A loader whose results the test controls, call by call. */
function controllableLoader() {
  const calls: Array<{ resolve: (v: string) => void; reject: (e: Error) => void }> = []
  const loader = vi.fn(() => new Promise<string>((resolve, reject) => calls.push({ resolve, reject })))
  return { loader, calls }
}

describe('useAsync', () => {
  it('goes from loading to ready', async () => {
    const { loader, calls } = controllableLoader()
    const { result } = renderHook(() => useAsync(loader))
    expect(result.current.status).toBe('loading')
    await act(async () => calls[0].resolve('data'))
    expect(result.current).toMatchObject({ status: 'ready', data: 'data', isRefreshing: false })
  })

  it('shows an error with a working retry', async () => {
    const { loader, calls } = controllableLoader()
    const { result } = renderHook(() => useAsync(loader))
    await act(async () => calls[0].reject(new Error('Server exploded')))
    expect(result.current).toMatchObject({ status: 'error', message: 'Server exploded' })

    act(() => (result.current.status === 'error' ? result.current.retry() : undefined))
    await act(async () => calls[1].resolve('ok now'))
    expect(result.current).toMatchObject({ status: 'ready', data: 'ok now' })
  })

  it('keeps showing the current data while reloading (no spinner flash)', async () => {
    const { loader, calls } = controllableLoader()
    const { result } = renderHook(() => useAsync(loader))
    await act(async () => calls[0].resolve('v1'))

    act(() => (result.current.status === 'ready' ? result.current.reload() : undefined))
    expect(result.current).toMatchObject({ status: 'ready', data: 'v1', isRefreshing: true })
    await act(async () => calls[1].resolve('v2'))
    expect(result.current).toMatchObject({ status: 'ready', data: 'v2', isRefreshing: false })
  })

  it('keeps the data and shows a message when a refresh fails', async () => {
    const { loader, calls } = controllableLoader()
    const { result } = renderHook(() => useAsync(loader))
    await act(async () => calls[0].resolve('v1'))

    act(() => (result.current.status === 'ready' ? result.current.reload() : undefined))
    await act(async () => calls[1].reject(new Error('Timeout')))
    expect(result.current).toMatchObject({ status: 'ready', data: 'v1', isRefreshing: false })
    expect(toast.error).toHaveBeenCalledWith("Couldn't refresh: Timeout")
  })

  it('refreshes on returning to the tab, but only if the data is old enough', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { loader, calls } = controllableLoader()
    renderHook(() => useAsync(loader))
    await act(async () => calls[0].resolve('v1'))

    const returnToTab = () => act(() => document.dispatchEvent(new Event('visibilitychange')))
    returnToTab()
    expect(loader).toHaveBeenCalledTimes(1) // just loaded: no refresh

    vi.setSystemTime(Date.now() + REFRESH_AFTER_MS + 1)
    returnToTab()
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(2))
  })

  it('does nothing when given no loader (e.g. demo mode)', () => {
    const { result } = renderHook(() => useAsync(null))
    expect(result.current.status).toBe('idle')
  })
})
