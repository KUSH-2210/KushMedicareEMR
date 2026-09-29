import { describe, expect, it } from 'vitest'
import type { MedicationOption, MedicineDraft } from './consultationTypes'
import { matchingAllergies, medicineFromStored, medicineSummary, rankMedications } from './medicationUtils'

function option(id: string, brand: string, generic: string, usage: number, favorite = false): MedicationOption {
  return {
    id, clinic_id: 'clinic-a', brand_name: brand, generic_name: generic, strength: '10 mg', formulation: 'Tablet',
    created_by: 'doctor-a', created_at: '2026-01-01', updated_at: '2026-01-01',
    preference: { clinic_id: 'clinic-a', doctor_id: 'doctor-a', medication_id: id, usage_count: usage, last_used_at: '2026-09-01', is_favorite: favorite, updated_at: '2026-09-01' },
  }
}

describe('medication workflow helpers', () => {
  const options = [option('1', 'Alpha', 'Paracetamol', 8), option('2', 'Beta', 'Azithromycin', 2, true)]

  it('searches brand, generic, and strength', () => {
    expect(rankMedications(options, 'alpha').map((item) => item.id)).toEqual(['1'])
    expect(rankMedications(options, 'azithro').map((item) => item.id)).toEqual(['2'])
    expect(rankMedications(options, '10 mg')).toHaveLength(2)
  })

  it('ranks favorites before usage count, then usage count', () => {
    expect(rankMedications(options).map((item) => item.id)).toEqual(['2', '1'])
    expect(rankMedications(options.map((item) => ({ ...item, preference: item.preference && { ...item.preference, is_favorite: false } }))).map((item) => item.id)).toEqual(['1', '2'])
  })

  it('reconstructs structured previous prescriptions and formats custom dosage', () => {
    const draft = medicineFromStored({
      id: 'rx-1', clinic_id: 'clinic-a', visit_id: 'visit-a', medication_id: null, prescribed_by: 'doctor-a', brand_name: null,
      generic_name: 'Test compound', formulation: 'Syrup', strength: '5 mg/ml', dose_value: null, dose_unit: null,
      dose_text: 'One teaspoon', frequency_code: null, frequency_text: 'At bedtime', food_timing: 'no_preference',
      duration_value: null, duration_unit: null, duration_text: 'Until review', instructions: 'Shake well', sort_order: 0, created_at: '2026-01-01',
    })
    expect(draft.genericName).toBe('Test compound')
    expect(medicineSummary(draft)).toBe('One teaspoon · At bedtime · Until review')
  })

  it('warns only when allergy text matches the brand or generic', () => {
    const medicine = { brandName: 'Test Penicillin', genericName: 'Penicillin V' } as MedicineDraft
    const allergies = [
      { id: 'a', allergen: 'Penicillin', is_active: true },
      { id: 'b', allergen: 'Peanut', is_active: true },
    ] as import('../../lib/database.types').PatientAllergy[]
    expect(matchingAllergies(medicine, allergies).map((item) => item.id)).toEqual(['a'])
  })
})
