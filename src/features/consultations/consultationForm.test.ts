import { describe, expect, it } from 'vitest'
import { buildConsultationPayload, calculateBmi, emptyConsultation, validateConsultation } from './consultationForm'
import type { ConsultationFormValues } from './consultationTypes'

function form(overrides: Partial<ConsultationFormValues> = {}): ConsultationFormValues {
  return { ...structuredClone(emptyConsultation), ...overrides }
}

describe('consultation form', () => {
  it('calculates BMI and converts Fahrenheit vitals for storage', () => {
    const values = form({ vitals: { ...emptyConsultation.vitals, systolicBp: '120', diastolicBp: '80', temperatureF: '98.6', weightKg: '72', heightCm: '180' } })
    expect(calculateBmi('72', '180')).toBe(22.2)
    expect(buildConsultationPayload('patient-1', values).p_vitals).toMatchObject({ systolicBp: 120, diastolicBp: 80, temperatureC: 37, weightKg: 72, heightCm: 180 })
  })

  it('serializes multiple symptoms with durations and examination findings', () => {
    const values = form({
      complaints: [
        { id: '1', name: 'Fever', durationValue: '3', durationUnit: 'days', notes: 'Intermittent' },
        { id: '2', name: 'Cough', durationValue: '1', durationUnit: 'weeks', notes: '' },
      ],
      examination: { ...emptyConsultation.examination, generalCondition: 'fair', pallor: 'absent', respiratorySystem: 'Clear bilaterally' },
    })
    const payload = buildConsultationPayload('patient-1', values)
    expect(payload.p_complaints).toEqual([
      { name: 'Fever', durationValue: 3, durationUnit: 'days', notes: 'Intermittent' },
      { name: 'Cough', durationValue: 1, durationUnit: 'weeks', notes: undefined },
    ])
    expect(payload.p_examination).toMatchObject({ generalCondition: 'fair', pallor: 'absent', respiratorySystem: 'Clear bilaterally' })
  })

  it('preserves one primary diagnosis, investigations, advice, and follow-up', () => {
    const values = form({
      diagnoses: [
        { id: '1', name: 'Viral fever', notes: '', isPrimary: true },
        { id: '2', name: 'Dehydration', notes: 'Mild', isPrimary: false },
      ],
      investigations: ['CBC', 'Urine Routine'],
      advice: ['Rest', 'Adequate hydration'],
      followUp: { type: 'interval', intervalValue: '3', intervalUnit: 'days', date: '', notes: 'Earlier if worse' },
    })
    const payload = buildConsultationPayload('patient-1', values)
    expect(payload.p_diagnoses).toEqual([
      { name: 'Viral fever', notes: undefined, isPrimary: true },
      { name: 'Dehydration', notes: 'Mild', isPrimary: false },
    ])
    expect(payload.p_investigations).toEqual(['CBC', 'Urine Routine'])
    expect(payload.p_advice).toEqual(['Rest', 'Adequate hydration'])
    expect(payload.p_follow_up).toMatchObject({ type: 'interval', intervalValue: 3, intervalUnit: 'days', notes: 'Earlier if worse' })
    expect(validateConsultation(values)).toEqual({})
  })

  it('serializes structured and custom medication fields', () => {
    const values = form({ medicines: [{
      id: 'medicine-1', medicationId: null, brandName: 'Test Brand', genericName: 'Test compound', formulation: 'Tablet', strength: '10 mg',
      doseValue: '0.5', doseUnit: 'tablet', doseText: '', frequencyCode: '', frequencyText: 'Every morning', foodTiming: 'after_food',
      durationValue: '', durationUnit: 'days', durationText: 'Until review', instructions: 'Test instruction',
    }] })
    expect(validateConsultation(values)).toEqual({})
    expect(buildConsultationPayload('patient-1', values).p_medications).toEqual([{
      medicationId: undefined, brandName: 'Test Brand', genericName: 'Test compound', formulation: 'Tablet', strength: '10 mg',
      doseValue: 0.5, doseUnit: 'tablet', doseText: undefined, frequencyCode: undefined, frequencyText: 'Every morning', foodTiming: 'after_food',
      durationValue: undefined, durationUnit: undefined, durationText: 'Until review', instructions: 'Test instruction',
    }])
  })

  it('requires complete dosage, frequency, and duration for prescribed medicines', () => {
    const values = form({ medicines: [{ id: 'medicine-1', medicationId: null, brandName: 'Test Brand', genericName: '', formulation: 'Tablet', strength: '', doseValue: '', doseUnit: '', doseText: '', frequencyCode: '', frequencyText: '', foodTiming: 'no_preference', durationValue: '', durationUnit: 'days', durationText: '', instructions: '' }] })
    expect(validateConsultation(values)).toMatchObject({ 'medicine.0.dose': expect.any(String), 'medicine.0.frequency': expect.any(String), 'medicine.0.duration': expect.any(String) })
  })

  it('rejects unsafe vital values, invalid durations, multiple primaries, and past follow-up dates', () => {
    const values = form({
      vitals: { ...emptyConsultation.vitals, oxygenSaturation: '101' },
      complaints: [{ id: '1', name: 'Fever', durationValue: '-1', durationUnit: 'days', notes: '' }],
      diagnoses: [
        { id: '1', name: 'A', notes: '', isPrimary: true },
        { id: '2', name: 'B', notes: '', isPrimary: true },
      ],
      followUp: { type: 'date', intervalValue: '', intervalUnit: 'days', date: '2026-01-01', notes: '' },
    })
    expect(validateConsultation(values, new Date('2026-09-26T10:00:00'))).toMatchObject({
      oxygenSaturation: expect.any(String), 'complaint.0.duration': expect.any(String), diagnoses: expect.any(String), followUp: expect.any(String),
    })
  })
})
