// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import type { createBrowserRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePasswordRecoveryRedirect } from '@/hooks/usePasswordRecoveryRedirect'

const listeners = vi.hoisted(() => [] as ((event: string) => void)[])
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string) => void) => {
        listeners.push(cb)
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
    },
  },
}))

function fakeRouter(pathname: string) {
  return { state: { location: { pathname } }, navigate: vi.fn() } as unknown as ReturnType<typeof createBrowserRouter>
}

beforeEach(() => {
  listeners.length = 0
  window.history.replaceState(null, '', '/')
})

describe('usePasswordRecoveryRedirect', () => {
  it('sends someone who arrived from a reset link to "choose a new password"', () => {
    const router = fakeRouter('/')
    renderHook(() => usePasswordRecoveryRedirect(router))
    listeners.forEach((cb) => cb('PASSWORD_RECOVERY'))
    expect(router.navigate).toHaveBeenCalledWith('/update-password', { replace: true })
  })

  it('also recognises the reset link address itself', () => {
    window.history.replaceState(null, '', '/#access_token=x&type=recovery')
    const router = fakeRouter('/')
    renderHook(() => usePasswordRecoveryRedirect(router))
    expect(router.navigate).toHaveBeenCalledWith('/update-password', { replace: true })
  })

  it('ignores normal sign-ins, and does nothing when already on the page', () => {
    const elsewhere = fakeRouter('/')
    renderHook(() => usePasswordRecoveryRedirect(elsewhere))
    listeners.forEach((cb) => cb('SIGNED_IN'))
    expect(elsewhere.navigate).not.toHaveBeenCalled()

    listeners.length = 0
    const onPage = fakeRouter('/update-password')
    renderHook(() => usePasswordRecoveryRedirect(onPage))
    listeners.forEach((cb) => cb('PASSWORD_RECOVERY'))
    expect(onPage.navigate).not.toHaveBeenCalled()
  })
})
