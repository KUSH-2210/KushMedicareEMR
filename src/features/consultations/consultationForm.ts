import type { Json } from '../../lib/database.types'
import type { ConsultationFormValues, ExaminationFormValues, MedicineDraft, VitalsFormValues } from './consultationTypes'

export const emptyVitals: VitalsFormValues = {
  systolicBp: '', diastolicBp: '', pulseBpm: '', temperatureF: '',
  oxygenSaturation: '', weightKg: '', heightCm: '', respiratoryRate: '',
}

export const emptyExamination: ExaminationFormValues = {
  generalCondition: 'not_assessed',
  pallor: 'not_assessed',
  icterus: 'not_assessed',
  cyanosis: 'not_assessed',
  clubbing: 'not_assessed',
  edema: 'not_assessed',
  lymphadenopathy: 'not_assessed',
  cvs: '', respiratorySystem: '', abdomen: '', cns: '', localExamination: '', otherFindings: '',
}

export const emptyConsultation: ConsultationFormValues = {
  vitals: emptyVitals,
  complaints: [],
  examination: emptyExamination,
  diagnoses: [],
  medicines: [],
  investigations: [],
  advice: [],
  followUp: { type: 'none', intervalValue: '', intervalUnit: 'days', date: '', notes: '' },
}

export function calculateBmi(weightKg: string, heightCm: string) {
  const weight = Number(weightKg)
  const height = Number(heightCm) / 100
  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) return null
  return Math.round((weight / (height * height)) * 10) / 10
}

function optionalNumber(value: string) {
  return value.trim() ? Number(value) : undefined
}

function temperatureFToC(value: string) {
  if (!value.trim()) return undefined
  return Math.round(((Number(value) - 32) * 5 / 9) * 10) / 10
}

export interface ConsultationRpcPayload {
  p_patient_id: string
  p_visited_at: string
  p_vitals: Json
  p_complaints: Json
  p_examination: Json
  p_diagnoses: Json
  p_medications: Json
  p_investigations: Json
  p_advice: Json
  p_follow_up: Json
}

export function buildMedicationPayload(medicines: MedicineDraft[]): Json {
  return medicines.map((item) => ({
    medicationId: item.medicationId ?? undefined,
    brandName: item.brandName.trim() || undefined,
    genericName: item.genericName.trim() || undefined,
    formulation: item.formulation.trim() || undefined,
    strength: item.strength.trim() || undefined,
    doseValue: optionalNumber(item.doseValue),
    doseUnit: item.doseUnit.trim() || undefined,
    doseText: item.doseText.trim() || undefined,
    frequencyCode: item.frequencyCode.trim() || undefined,
    frequencyText: item.frequencyText.trim() || undefined,
    foodTiming: item.foodTiming,
    durationValue: optionalNumber(item.durationValue),
    durationUnit: item.durationValue.trim() ? item.durationUnit : undefined,
    durationText: item.durationText.trim() || undefined,
    instructions: item.instructions.trim() || undefined,
  }))
}

export function buildConsultationPayload(patientId: string, values: ConsultationFormValues): ConsultationRpcPayload {
  const vitals = {
    systolicBp: optionalNumber(values.vitals.systolicBp),
    diastolicBp: optionalNumber(values.vitals.diastolicBp),
    pulseBpm: optionalNumber(values.vitals.pulseBpm),
    temperatureC: temperatureFToC(values.vitals.temperatureF),
    respiratoryRate: optionalNumber(values.vitals.respiratoryRate),
    oxygenSaturation: optionalNumber(values.vitals.oxygenSaturation),
    weightKg: optionalNumber(values.vitals.weightKg),
    heightCm: optionalNumber(values.vitals.heightCm),
  }
  const compactVitals = Object.fromEntries(Object.entries(vitals).filter(([, value]) => value !== undefined))

  return {
    p_patient_id: patientId,
    p_visited_at: new Date().toISOString(),
    p_vitals: compactVitals,
    p_complaints: values.complaints.map((item) => ({
      name: item.name.trim(),
      durationValue: optionalNumber(item.durationValue),
      durationUnit: item.durationValue.trim() ? item.durationUnit : undefined,
      notes: item.notes.trim() || undefined,
    })),
    p_examination: Object.fromEntries(
      Object.entries(values.examination).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
    ),
    p_diagnoses: values.diagnoses.map((item) => ({
      name: item.name.trim(), notes: item.notes.trim() || undefined, isPrimary: item.isPrimary,
    })),
    p_medications: buildMedicationPayload(values.medicines),
    p_investigations: values.investigations.map((item) => item.trim()),
    p_advice: values.advice.map((item) => item.trim()),
    p_follow_up: {
      type: values.followUp.type,
      intervalValue: values.followUp.type === 'interval' ? optionalNumber(values.followUp.intervalValue) : undefined,
      intervalUnit: values.followUp.type === 'interval' ? values.followUp.intervalUnit : undefined,
      date: values.followUp.type === 'date' ? values.followUp.date : undefined,
      notes: values.followUp.notes.trim() || undefined,
    },
  }
}

export type ConsultationErrors = Record<string, string>

function validateNumber(errors: ConsultationErrors, key: string, value: string, min: number, max: number, label: string) {
  if (!value.trim()) return
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) {
    errors[key] = `${label} must be between ${min} and ${max}.`
  }
}

export function validateConsultation(values: ConsultationFormValues, today = new Date()): ConsultationErrors {
  const errors: ConsultationErrors = {}
  validateNumber(errors, 'systolicBp', values.vitals.systolicBp, 40, 300, 'Systolic BP')
  validateNumber(errors, 'diastolicBp', values.vitals.diastolicBp, 20, 200, 'Diastolic BP')
  validateNumber(errors, 'pulseBpm', values.vitals.pulseBpm, 20, 300, 'Pulse')
  validateNumber(errors, 'temperatureF', values.vitals.temperatureF, 77, 122, 'Temperature')
  validateNumber(errors, 'oxygenSaturation', values.vitals.oxygenSaturation, 0, 100, 'SpO₂')
  validateNumber(errors, 'weightKg', values.vitals.weightKg, 0.01, 1000, 'Weight')
  validateNumber(errors, 'heightCm', values.vitals.heightCm, 0.01, 300, 'Height')
  validateNumber(errors, 'respiratoryRate', values.vitals.respiratoryRate, 3, 100, 'Respiratory rate')

  values.complaints.forEach((item, index) => {
    if (!item.name.trim()) errors[`complaint.${index}.name`] = 'Symptom is required.'
    if (item.durationValue && (!Number.isFinite(Number(item.durationValue)) || Number(item.durationValue) <= 0)) {
      errors[`complaint.${index}.duration`] = 'Duration must be greater than zero.'
    }
  })

  if (values.diagnoses.length > 0 && values.diagnoses.filter((item) => item.isPrimary).length !== 1) {
    errors.diagnoses = 'Mark exactly one diagnosis as primary.'
  }

  values.medicines.forEach((item, index) => {
    if (!item.brandName.trim() && !item.genericName.trim()) errors[`medicine.${index}.name`] = 'Medicine name is required.'
    if (!item.doseValue.trim() && !item.doseText.trim()) errors[`medicine.${index}.dose`] = 'Choose or enter a dose.'
    if (item.doseValue && (!Number.isFinite(Number(item.doseValue)) || Number(item.doseValue) <= 0)) errors[`medicine.${index}.dose`] = 'Dose must be greater than zero.'
    if (!item.frequencyCode.trim() && !item.frequencyText.trim()) errors[`medicine.${index}.frequency`] = 'Choose or enter a frequency.'
    if (!item.durationValue.trim() && !item.durationText.trim()) errors[`medicine.${index}.duration`] = 'Choose or enter a duration.'
    if (item.durationValue && (!Number.isFinite(Number(item.durationValue)) || Number(item.durationValue) <= 0)) errors[`medicine.${index}.duration`] = 'Duration must be greater than zero.'
  })

  if (values.followUp.type === 'interval') {
    const interval = Number(values.followUp.intervalValue)
    if (!Number.isInteger(interval) || interval < 1 || interval > 365) {
      errors.followUp = 'Follow-up interval must be between 1 and 365.'
    }
  }
  if (values.followUp.type === 'date') {
    const date = values.followUp.date ? new Date(`${values.followUp.date}T00:00:00`) : null
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (!date || Number.isNaN(date.getTime()) || date < start) errors.followUp = 'Choose today or a future date.'
  }

  return errors
}
