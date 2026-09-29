import { describe, expect, it, vi } from 'vitest'
import { printPrescription, sanitizePrescriptionFilename } from './prescriptionUtils'
import { saveBeforePrint } from './savePrintWorkflow'

describe('prescription output utilities', () => {
  it('creates a safe patient-specific PDF filename', () => {
    expect(sanitizePrescriptionFilename('Test / Patient: Example', '2026-09-27T10:00:00Z')).toBe('Test_Patient_Example_2026-09-27_Prescription.pdf')
    expect(sanitizePrescriptionFilename('../../', 'invalid')).toBe('Patient_unknown-date_Prescription.pdf')
  })

  it('applies the selected page size only during printing', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const originalTitle = document.title
    printPrescription('Test_Patient_2026-09-27_Prescription.pdf', 'A5')
    expect(print).toHaveBeenCalledOnce()
    expect(document.title).toBe(originalTitle)
    expect(document.querySelector('[data-prescription-page]')).not.toBeInTheDocument()
  })
})

describe('Save & Print sequencing', () => {
  it('opens the canonical saved visit only after save succeeds', async () => {
    const order: string[] = []
    const open = vi.fn((visitId: string) => { order.push(`open:${visitId}`) })
    await saveBeforePrint(async () => { order.push('save'); return 'visit-test' }, open)
    expect(order).toEqual(['save', 'open:visit-test'])
  })

  it('does not open printing when save fails', async () => {
    const open = vi.fn()
    await expect(saveBeforePrint(async () => { throw new Error('save failed') }, open)).rejects.toThrow('save failed')
    expect(open).not.toHaveBeenCalled()
  })
})
