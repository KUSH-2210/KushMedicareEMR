import type { PatientAllergy, PrescriptionItem, PrescriptionTemplateItem } from '../../lib/database.types'
import type { MedicationOption, MedicineDraft } from './consultationTypes'

export function medicationLabel(medicine: Pick<MedicineDraft, 'brandName' | 'genericName' | 'strength'>) {
  const name = medicine.brandName.trim() || medicine.genericName.trim() || 'Unnamed medicine'
  return [name, medicine.strength.trim()].filter(Boolean).join(' ')
}

export function emptyMedicine(overrides: Partial<MedicineDraft> = {}): MedicineDraft {
  return {
    id: crypto.randomUUID(), medicationId: null, brandName: '', genericName: '', formulation: 'Tablet', strength: '',
    doseValue: '1', doseUnit: 'tablet', doseText: '', frequencyCode: 'OD', frequencyText: '',
    foodTiming: 'after_food', durationValue: '3', durationUnit: 'days', durationText: '', instructions: '',
    ...overrides,
  }
}

export function medicineFromOption(option: MedicationOption): MedicineDraft {
  return emptyMedicine({
    medicationId: option.id,
    brandName: option.brand_name ?? '',
    genericName: option.generic_name ?? '',
    formulation: option.formulation ?? '',
    strength: option.strength ?? '',
    doseUnit: option.formulation?.toLocaleLowerCase() || 'unit',
  })
}

export function medicineFromStored(item: PrescriptionItem | PrescriptionTemplateItem): MedicineDraft {
  return emptyMedicine({
    medicationId: item.medication_id,
    brandName: item.brand_name ?? '', genericName: item.generic_name ?? '', formulation: item.formulation ?? '', strength: item.strength ?? '',
    doseValue: item.dose_value?.toString() ?? '', doseUnit: item.dose_unit ?? '', doseText: item.dose_text ?? '',
    frequencyCode: item.frequency_code ?? '', frequencyText: item.frequency_text ?? '', foodTiming: item.food_timing,
    durationValue: item.duration_value?.toString() ?? '', durationUnit: item.duration_unit ?? 'days',
    durationText: item.duration_text ?? '', instructions: item.instructions ?? '',
  })
}

export function rankMedications(options: MedicationOption[], query = '') {
  const needle = query.trim().toLocaleLowerCase()
  return options
    .filter((item) => !needle || [item.brand_name, item.generic_name, item.strength].some((value) => value?.toLocaleLowerCase().includes(needle)))
    .toSorted((a, b) => {
      const favorite = Number(b.preference?.is_favorite ?? false) - Number(a.preference?.is_favorite ?? false)
      if (favorite) return favorite
      const usage = (b.preference?.usage_count ?? 0) - (a.preference?.usage_count ?? 0)
      if (usage) return usage
      return (b.preference?.last_used_at ?? '').localeCompare(a.preference?.last_used_at ?? '')
    })
}

function normalizedTokens(value: string) {
  return value.toLocaleLowerCase().split(/[^\p{L}\p{N}]+/u).filter((token) => token.length >= 3)
}

export function matchingAllergies(medicine: Pick<MedicineDraft, 'brandName' | 'genericName'>, allergies: PatientAllergy[]) {
  const medicineText = `${medicine.brandName} ${medicine.genericName}`.toLocaleLowerCase()
  return allergies.filter((allergy) => {
    const allergen = allergy.allergen.trim().toLocaleLowerCase()
    return allergen.length >= 3 && (medicineText.includes(allergen) || normalizedTokens(allergen).some((token) => medicineText.includes(token)))
  })
}

export function medicineSummary(item: Pick<MedicineDraft, 'doseValue' | 'doseUnit' | 'doseText' | 'frequencyCode' | 'frequencyText' | 'foodTiming' | 'durationValue' | 'durationUnit' | 'durationText'>) {
  const dose = item.doseText || [item.doseValue, item.doseUnit].filter(Boolean).join(' ')
  const frequency = item.frequencyText || item.frequencyCode
  const timing = item.foodTiming === 'no_preference' ? '' : item.foodTiming.replaceAll('_', ' ')
  const duration = item.durationText || (item.durationValue ? `${item.durationValue} ${item.durationUnit}` : '')
  return [dose, frequency, timing, duration].filter(Boolean).join(' · ')
}
