import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState } from '../features/auth/auth-context'
import { LoginPage } from './LoginPage'

function renderLogin(signIn: AuthState['signIn'], overrides: Partial<AuthState> = {}) {
  const auth: AuthState = {
    session: null,
    user: null,
    profile: null,
    clinic: null,
    loading: false,
    error: null,
    configured: true,
    refreshMembership: vi.fn(),
    signIn,
    signOut: vi.fn(),
    ...overrides,
  }

  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('LoginPage', () => {
  it('submits configured credentials and presents authentication errors', async () => {
    const signIn = vi.fn().mockRejectedValue(new Error('Invalid login credentials'))
    renderLogin(signIn)

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'staff@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in securely' }))

    expect(signIn).toHaveBeenCalledWith('staff@example.test', 'short')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials')
  })

  it('does not impose account-creation password rules on sign-in', () => {
    renderLogin(vi.fn())
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('minlength')
  })

  it('shows a clinic-membership error and lets the user reset the session', () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    renderLogin(vi.fn(), {
      session: { user: { id: 'test-user' } } as AuthState['session'],
      user: { id: 'test-user' } as AuthState['user'],
      error: 'Your account is not assigned to a clinic. Contact an administrator.',
      signOut,
    })

    expect(screen.getByRole('alert')).toHaveTextContent('not assigned to a clinic')
    fireEvent.click(screen.getByRole('button', { name: 'Sign out and try another account' }))
    expect(signOut).toHaveBeenCalledOnce()
  })
})
