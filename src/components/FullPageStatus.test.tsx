import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FullPageStatus } from './FullPageStatus'

describe('FullPageStatus', () => {
  it('announces a configuration error accessibly', () => {
    render(<FullPageStatus title="Connect Supabase" message="Configuration is required." />)

    expect(screen.getByRole('heading', { name: 'Connect Supabase' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('aria-live', 'polite')
  })
})
