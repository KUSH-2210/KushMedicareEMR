import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { emptyConsultation } from '../consultationForm'
import type { ConsultationContext } from '../consultationTypes'
import { ConsultationPreview } from './ConsultationPreview'

const context = {
  patient: { id: 'patient-a', clinic_id: 'clinic-a', first_name: 'Test', last_name: 'Patient', date_of_birth: '1990-01-01', sex: 'unknown', medical_record_number: 'TEST-001', phone: null, email: null, address: null, emergency_contact_name: null, emergency_contact_phone: null, created_by: 'doctor-a', created_at: '2026-01-01', updated_at: '2026-01-01' },
  allergies: [], previousVisit: null, medicationOptions: [], previousMedicines: [], templates: [], adviceSnippets: [],
} satisfies ConsultationContext

describe('consultation preview', () => {
  it('updates the real draft document renderer including medicines', () => {
    const values = structuredClone(emptyConsultation)
    const { rerender } = render(<ConsultationPreview context={context} values={values} clinic={null} profile={null} onBackToMedicines={vi.fn()} />)
    expect(screen.getByText(/Unsaved draft/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Prescription/ })).not.toBeInTheDocument()
    values.medicines = [{ id: 'm1', medicationId: null, brandName: 'Test Brand', genericName: 'Test compound', formulation: 'Tablet', strength: '10 mg', doseValue: '1', doseUnit: 'tablet', doseText: '', frequencyCode: 'BD', frequencyText: '', foodTiming: 'after_food', durationValue: '3', durationUnit: 'days', durationText: '', instructions: '' }]
    rerender(<ConsultationPreview context={context} values={values} clinic={null} profile={null} onBackToMedicines={vi.fn()} />)
    expect(screen.getByText('Test Brand 10 mg')).toBeInTheDocument()
    expect(screen.getByText(/1 tablet · BD · after food · 3 days/)).toBeInTheDocument()
  })
})
