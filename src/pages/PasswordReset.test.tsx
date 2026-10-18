// @vitest-environment jsdom
/** The "forgot password" flow: request a link, then choose a new password. */
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { UpdatePasswordPage } from '@/pages/UpdatePasswordPage'
import { routes as lazyRoutes } from '@/router'
import { preloadRoutes, renderPage, renderRoutes } from '@/test/render'

vi.mock('@/services/auth', () => ({
  requestPasswordReset: vi.fn(async () => {}),
  updatePassword: vi.fn(async () => {}),
  signIn: vi.fn(),
  signUp: vi.fn(),
}))
const auth = await import('@/services/auth')

// Every page already loaded (see preloadRoutes).
const routes = await preloadRoutes(lazyRoutes)

beforeEach(() => vi.clearAllMocks())

describe('Forgot password', () => {
  it('is linked from the sign-in page', async () => {
    const { user, router } = renderRoutes(routes, { url: '/login', auth: 'signed_out' })
    await user.click(await screen.findByRole('link', { name: 'Forgot password?' }))
    expect(await screen.findByRole('heading', { name: 'Reset your password' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/forgot-password')
  })

  it('sends the link, without revealing whether the email has an account', async () => {
    const { user } = renderPage(<ForgotPasswordPage />, { auth: 'signed_out' })
    await user.type(screen.getByLabelText('Email'), 'student@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(auth.requestPasswordReset).toHaveBeenCalledWith('student@example.com')
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText('student@example.com').closest('p')).toHaveTextContent(/^If student@example\.com has an account, we've sent it a link/)
  })

  it('checks the email and explains errors', async () => {
    const { user } = renderPage(<ForgotPasswordPage />, { auth: 'signed_out' })
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(auth.requestPasswordReset).not.toHaveBeenCalled()

    vi.mocked(auth.requestPasswordReset).mockRejectedValueOnce({ message: 'For security purposes, you can only request this after 52 seconds.' })
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'student@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait a minute before requesting another email.')
  })
})

describe('Choose a new password', () => {
  it('saves a new password and returns to the app', async () => {
    const { user, router } = renderRoutes(routes, { url: '/update-password', auth: 'signed_in' })
    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('New password'), 'correct-horse-9')
    await user.type(screen.getByLabelText('Confirm new password'), 'correct-horse-9')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))

    expect(auth.updatePassword).toHaveBeenCalledWith('correct-horse-9')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByText('Password changed')).toBeInTheDocument()
  })

  it('requires matching passwords of at least 8 characters', async () => {
    const { user } = renderPage(<UpdatePasswordPage />)
    await user.type(await screen.findByLabelText('New password'), 'short')
    await user.type(screen.getByLabelText('Confirm new password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument()
    expect(screen.getByText("Passwords don't match")).toBeInTheDocument()
    expect(auth.updatePassword).not.toHaveBeenCalled()
  })

  it('explains an expired link (no session) and offers a new one', async () => {
    renderRoutes(routes, { url: '/update-password', auth: 'signed_out' })
    expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute('href', '/forgot-password')
  })

  it('keeps the form and shows why when saving fails', async () => {
    vi.mocked(auth.updatePassword).mockRejectedValueOnce({ message: 'New password should be different from the old password.' })
    const { user } = renderPage(<UpdatePasswordPage />)
    await user.type(await screen.findByLabelText('New password'), 'same-as-before')
    await user.type(screen.getByLabelText('Confirm new password'), 'same-as-before')
    await user.click(screen.getByRole('button', { name: 'Save new password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a password different from your current one.')
    expect(screen.getByLabelText('New password')).toHaveValue('same-as-before')
  })
})
