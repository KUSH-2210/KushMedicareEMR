import { describe, expect, it } from 'vitest'
import type { Profile, Visit, VisitComplaint, VisitDiagnosis } from '../../lib/database.types'
import { assembleConsultationHistory, getConsultationErrorMessage } from './consultationService'

const visit = { id: 'visit-1', clinician_id: 'user-1', visited_at: '2026-09-26T10:00:00Z' } as Visit

describe('consultation history', () => {
  it('associates sorted complaints, primary diagnosis, and clinician without exposing unrelated rows', () => {
    const result = assembleConsultationHistory(
      [visit],
      [{ id: 'diagnosis-1', visit_id: 'visit-1', diagnosis: 'Viral fever', is_primary: true } as VisitDiagnosis, { id: 'other', visit_id: 'visit-2', is_primary: true } as VisitDiagnosis],
      [{ id: '2', visit_id: 'visit-1', symptom: 'Cough', sort_order: 1 } as VisitComplaint, { id: '1', visit_id: 'visit-1', symptom: 'Fever', sort_order: 0 } as VisitComplaint],
      [{ id: 'user-1', full_name: 'Dr Test' } as Profile],
    )
    expect(result).toHaveLength(1)
    expect(result[0].primaryDiagnosis?.diagnosis).toBe('Viral fever')
    expect(result[0].complaints.map((item) => item.symptom)).toEqual(['Fever', 'Cough'])
    expect(result[0].clinician?.full_name).toBe('Dr Test')
    expect(result[0].medicineCount).toBe(0)
  })

  it('maps database errors to safe user-facing messages', () => {
    expect(getConsultationErrorMessage({ code: 'PGRST205', message: "Could not find table 'patient_allergies'" }, 'fallback')).toContain('latest migration')
    expect(getConsultationErrorMessage({ code: '42501', message: 'private database detail' }, 'fallback')).toContain('permission')
    expect(getConsultationErrorMessage({ code: '22P02' }, 'fallback')).toContain('invalid')
    expect(getConsultationErrorMessage(new Error('private'), 'fallback')).toBe('fallback')
  })
})
