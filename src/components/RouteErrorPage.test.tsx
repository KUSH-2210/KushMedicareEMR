import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RouteErrorPage } from './RouteErrorPage'

describe('RouteErrorPage', () => {
  it('provides a safe recovery screen without exposing error details', () => {
    render(<RouteErrorPage />)

    expect(screen.getByRole('heading', { name: 'This page could not be opened' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Return to patients' })).toHaveAttribute('href', '/app/patients')
    expect(screen.queryByText(/TypeError|stack|localhost/i)).not.toBeInTheDocument()
  })
})
