import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { emptyConsultation } from '../consultationForm'
import type { ConsultationContext, ConsultationFormValues } from '../consultationTypes'
import type { ConsultationTab } from '../consultationTabs'
import { ConsultationWorkspace } from './ConsultationWorkspace'

const context = {
  patient: { id: 'patient-a', clinic_id: 'clinic-a', first_name: 'Test', last_name: 'Patient', date_of_birth: '1990-01-01', sex: 'unknown', medical_record_number: 'TEST-001', phone: null, email: null, address: null, emergency_contact_name: null, emergency_contact_phone: null, created_by: 'doctor-a', created_at: '2026-01-01', updated_at: '2026-01-01' },
  allergies: [], previousVisit: null, medicationOptions: [], previousMedicines: [], templates: [], adviceSnippets: [],
} as ConsultationContext

function Harness() {
  const [tab, setTab] = useState<ConsultationTab>('symptoms')
  const [values, setValues] = useState<ConsultationFormValues>(() => structuredClone(emptyConsultation))
  const change = <K extends keyof ConsultationFormValues>(key: K, value: ConsultationFormValues[K]) => setValues((current) => ({ ...current, [key]: value }))
  return <ConsultationWorkspace activeTab={tab} onActiveTab={setTab} context={context} values={values} errors={{}} clinic={null} profile={null} onChange={change} onFavorite={vi.fn()} onApplyTemplate={vi.fn()} onSaveTemplate={vi.fn()} />
}

describe('tabbed consultation workspace', () => {
  it('keeps one draft across tabs and marks completed tabs', () => {
    render(<Harness />)
    expect(screen.getByRole('tab', { name: 'Symptoms' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('button', { name: '+ Fever' }))
    expect(within(screen.getByRole('tabpanel', { name: /Symptoms/ })).getByText('Fever')).toBeInTheDocument()
    expect(within(screen.getByRole('tab', { name: /Symptoms/ })).getByLabelText('complete')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Vitals' }))
    expect(screen.getByRole('tab', { name: 'Vitals' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: /Symptoms/ }))
    expect(within(screen.getByRole('tabpanel', { name: /Symptoms/ })).getByText('Fever')).toBeInTheDocument()
  })

  it('preserves an in-progress inline medicine editor when changing tabs', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('tab', { name: 'Medicines' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Custom medicine' }))
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Unsaved Test Medicine' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Symptoms' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Medicines' }))
    expect(screen.getByLabelText('Brand')).toHaveValue('Unsaved Test Medicine')
  })
})
