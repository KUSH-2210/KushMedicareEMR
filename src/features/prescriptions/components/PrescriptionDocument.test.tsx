import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PrescriptionDocumentData } from '../prescriptionTypes'
import { PrescriptionDocument } from './PrescriptionDocument'

const base: PrescriptionDocumentData = {
  state: 'saved', paperSize: 'A4', prescriptionNumber: 'RX-2026-000123', date: '27 Sep 2026',
  clinic: { name: 'Test Clinic', address: 'Test address', phone: '0000000000', email: 'clinic@example.test', footer: 'Test footer', logoUrl: 'data:image/png;base64,test' },
  doctor: { name: 'Dr Test', qualification: 'MBBS', specialization: 'General Medicine', registrationNumber: 'TEST-REG-1', additionalCredentials: null, signatureUrl: 'data:image/png;base64,test' },
  patient: { name: 'Test Patient', age: 36, sex: 'unknown', patientId: 'TEST-001', phone: null },
  vitals: ['BP 120/80 mmHg'], symptoms: [{ primary: 'Fever', detail: '2 days' }], examination: ['General condition: well'],
  diagnoses: [{ primary: 'Test diagnosis', secondary: 'Primary' }], medicines: [{ primary: 'Test Brand 10 mg', secondary: 'Test Generic · Tablet', detail: '1 tablet · BD · after food · 3 days', note: 'Test instruction' }],
  investigations: ['Test panel'], advice: ['Test advice'], followUp: 'After 3 days',
}

describe('PrescriptionDocument', () => {
  it.each(['A4', 'A5'] as const)('renders the complete saved prescription on %s', (paperSize) => {
    render(<PrescriptionDocument data={base} paperSize={paperSize} />)
    expect(screen.getByLabelText('Saved prescription')).toHaveClass(`prescription-document--${paperSize.toLowerCase()}`)
    expect(screen.getByText('Test Clinic')).toBeInTheDocument()
    expect(screen.getAllByText('Dr Test')).toHaveLength(2)
    expect(screen.getByText('Reg. No. TEST-REG-1')).toBeInTheDocument()
    expect(screen.getByText('Test Patient')).toBeInTheDocument()
    expect(screen.getByText('Test Brand 10 mg')).toBeInTheDocument()
    expect(screen.getByAltText('Clinic logo')).toBeInTheDocument()
    expect(screen.getByAltText('Doctor signature')).toBeInTheDocument()
    expect(screen.getByText('Test panel')).toBeInTheDocument()
    expect(screen.getByText('Test advice')).toBeInTheDocument()
  })

  it('omits the Rx section for an old consultation without medicines', () => {
    render(<PrescriptionDocument data={{ ...base, prescriptionNumber: null, medicines: [] }} />)
    expect(screen.queryByRole('heading', { name: /Prescription/ })).not.toBeInTheDocument()
    expect(screen.getByText('Test diagnosis')).toBeInTheDocument()
  })

  it('uses A4 for a legacy consultation without a saved paper size', () => {
    const legacy = { ...base, paperSize: undefined } as unknown as PrescriptionDocumentData
    render(<PrescriptionDocument data={legacy} />)
    expect(screen.getByLabelText('Saved prescription')).toHaveClass('prescription-document--a4')
    expect(screen.getByText('Test diagnosis')).toBeInTheDocument()
  })
})
