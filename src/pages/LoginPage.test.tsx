// @vitest-environment jsdom
/** Sign-in form: validation and friendly server errors. */
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/pages/LoginPage'
import { renderPage } from '@/test/render'

vi.mock('@/services/auth', () => ({ signIn: vi.fn(), signUp: vi.fn() }))
const auth = await import('@/services/auth')

beforeEach(() => vi.clearAllMocks())

describe('Sign in', () => {
  it('validates before contacting the server', async () => {
    const { user } = renderPage(<LoginPage />, { auth: 'signed_out' })
    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('turns a wrong password into a clear message', async () => {
    vi.mocked(auth.signIn).mockRejectedValue({ message: 'Invalid login credentials' })
    const { user } = renderPage(<LoginPage />, { auth: 'signed_out' })
    await user.type(screen.getByLabelText('Email'), 'me@uni.edu')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
    expect(auth.signIn).toHaveBeenCalledWith({ email: 'me@uni.edu', password: 'wrong-password' })
  })

  it('explains an unconfirmed email', async () => {
    vi.mocked(auth.signIn).mockRejectedValue({ message: 'Email not confirmed' })
    const { user } = renderPage(<LoginPage />, { auth: 'signed_out' })
    await user.type(screen.getByLabelText('Email'), 'me@uni.edu')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/confirm your email/i))
  })
})
