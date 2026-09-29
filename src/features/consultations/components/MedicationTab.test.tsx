import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MedicationOption, MedicineDraft } from '../consultationTypes'
import { MedicationTab } from './MedicationTab'

function Harness({ options = [], allergies = [] }: { options?: MedicationOption[]; allergies?: import('../../../lib/database.types').PatientAllergy[] }) {
  const [medicines, setMedicines] = useState<MedicineDraft[]>([])
  return <MedicationTab value={medicines} options={options} previous={[]} templates={[]} allergies={allergies} errors={{}} onChange={setMedicines} onFavorite={vi.fn()} onApplyTemplate={vi.fn()} onSaveTemplate={vi.fn()} />
}

describe('medicine tab', () => {
  it('adds, edits, orders, and removes custom medicines inline', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '+ Custom medicine' }))
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Test One' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add medicine' }))
    expect(screen.getByText('Test One')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Custom medicine' }))
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Test Two' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add medicine' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move Test Two up' }))
    const prescribed = screen.getByText('Current prescription').parentElement
    expect(prescribed?.textContent?.indexOf('Test Two')).toBeLessThan(prescribed?.textContent?.indexOf('Test One') ?? 0)

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    fireEvent.change(screen.getByLabelText(/Instructions/), { target: { value: 'Test instruction' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update medicine' }))
    expect(screen.getByText('Test instruction')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0])
    expect(screen.getByText(/Current prescription/).parentElement).toHaveTextContent('1')
  })

  it('searches catalogue entries and displays a matching allergy warning', () => {
    const option = { id: 'med-a', clinic_id: 'clinic-a', brand_name: 'Test Penicillin', generic_name: 'Penicillin V', formulation: 'Tablet', strength: '10 mg', created_by: 'doctor-a', created_at: '2026-01-01', updated_at: '2026-01-01', preference: null } satisfies MedicationOption
    const allergy = { id: 'allergy-a', clinic_id: 'clinic-a', patient_id: 'patient-a', allergen: 'Penicillin', reaction: null, severity: 'unknown', is_active: true, recorded_by: 'doctor-a', created_at: '2026-01-01' } as const
    render(<Harness options={[option]} allergies={[allergy]} />)
    fireEvent.change(screen.getByLabelText('Search brand, generic, or strength'), { target: { value: 'penicillin v' } })
    fireEvent.click(screen.getByRole('button', { name: /^Test Penicillin 10 mg/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('Penicillin')
  })
})
