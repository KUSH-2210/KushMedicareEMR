import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState } from '../features/auth/auth-context'
import { NewPatientPage } from './NewPatientPage'

const auth: AuthState = {
  session: null,
  user: { id: 'test-user' } as AuthState['user'],
  profile: {
    id: 'test-user',
    clinic_id: 'test-clinic',
    full_name: 'Test Doctor',
    role: 'doctor',
    display_name: null,
    qualification: null,
    specialization: null,
    medical_registration_number: null,
    additional_credentials: null,
    signature_path: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  clinic: null,
  loading: false,
  error: null,
  configured: true,
  refreshMembership: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}

describe('NewPatientPage', () => {
  it('blocks an incomplete patient record with field-level errors', () => {
    render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter>
          <NewPatientPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create patient' }))

    expect(screen.getByText('Enter a valid first name (up to 80 characters).')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid last name (up to 80 characters).')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid date of birth.')).toBeInTheDocument()
    expect(screen.getByText('Select a sex value for the clinical record.')).toBeInTheDocument()
  })
})
