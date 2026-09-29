import type { Clinic, Profile } from '../../lib/database.types'
import { calculateBmi } from '../consultations/consultationForm'
import { medicationLabel, medicineSummary } from '../consultations/medicationUtils'
import type { ConsultationContext, ConsultationDetail, ConsultationFormValues } from '../consultations/consultationTypes'
import { normalizePrescriptionPaperSize, type PrescriptionDocumentData, type PrescriptionPaperSize } from './prescriptionTypes'

export interface PrescriptionAssetUrls { logoUrl: string | null; signatureUrl: string | null }

function ageAt(dateOfBirth: string, atDate: string) {
  const birth = new Date(`${dateOfBirth}T00:00:00`)
  const at = new Date(atDate)
  let age = at.getFullYear() - birth.getFullYear()
  if (at.getMonth() < birth.getMonth() || (at.getMonth() === birth.getMonth() && at.getDate() < birth.getDate())) age -= 1
  return age
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function clinicData(clinic: Clinic | null, assets: PrescriptionAssetUrls) {
  return {
    name: clinic?.prescription_name || clinic?.name || 'Clinic', address: clinic?.address ?? null,
    phone: clinic?.phone ?? null, email: clinic?.prescription_email ?? null,
    footer: clinic?.prescription_footer ?? null, logoUrl: assets.logoUrl,
  }
}

function doctorData(profile: Profile | null, assets: PrescriptionAssetUrls) {
  return {
    name: profile?.display_name || profile?.full_name || 'Doctor', qualification: profile?.qualification ?? null,
    specialization: profile?.specialization ?? null, registrationNumber: profile?.medical_registration_number ?? null,
    additionalCredentials: profile?.additional_credentials ?? null, signatureUrl: assets.signatureUrl,
  }
}

function draftFollowUp(values: ConsultationFormValues) {
  if (values.followUp.type === 'interval') return `After ${values.followUp.intervalValue} ${values.followUp.intervalUnit}${values.followUp.notes ? ` - ${values.followUp.notes}` : ''}`
  if (values.followUp.type === 'date') return `On ${formatDate(`${values.followUp.date}T00:00:00`)}${values.followUp.notes ? ` - ${values.followUp.notes}` : ''}`
  return values.followUp.notes || 'No follow-up planned'
}

function savedFollowUp(detail: ConsultationDetail) {
  const { visit } = detail
  const base = visit.follow_up_type === 'interval'
    ? `After ${visit.follow_up_interval_value} ${visit.follow_up_interval_unit}`
    : visit.follow_up_type === 'date' && visit.follow_up_date
      ? `On ${formatDate(`${visit.follow_up_date}T00:00:00`)}`
      : 'No follow-up planned'
  return visit.follow_up_notes ? `${base} - ${visit.follow_up_notes}` : base
}

function draftExamination(values: ConsultationFormValues) {
  const items = [
    values.examination.generalCondition !== 'not_assessed' ? `General condition: ${values.examination.generalCondition}` : '',
    values.examination.cvs ? `CVS: ${values.examination.cvs}` : '',
    values.examination.respiratorySystem ? `Respiratory: ${values.examination.respiratorySystem}` : '',
    values.examination.abdomen ? `Abdomen: ${values.examination.abdomen}` : '',
    values.examination.cns ? `CNS: ${values.examination.cns}` : '',
    values.examination.localExamination ? `Local: ${values.examination.localExamination}` : '',
    values.examination.otherFindings,
  ]
  return items.filter(Boolean)
}

function savedExamination(detail: ConsultationDetail) {
  if (!detail.examination) return []
  const item = detail.examination
  return [
    item.general_condition !== 'not_assessed' ? `General condition: ${item.general_condition}` : '',
    item.cvs ? `CVS: ${item.cvs}` : '', item.respiratory_system ? `Respiratory: ${item.respiratory_system}` : '',
    item.abdomen ? `Abdomen: ${item.abdomen}` : '', item.cns ? `CNS: ${item.cns}` : '',
    item.local_examination ? `Local: ${item.local_examination}` : '', item.other_findings ?? '',
  ].filter(Boolean)
}

export function buildDraftPrescription(
  context: ConsultationContext, values: ConsultationFormValues, clinic: Clinic | null, profile: Profile | null,
  assets: PrescriptionAssetUrls = { logoUrl: null, signatureUrl: null }, date = new Date().toISOString(),
): PrescriptionDocumentData {
  const bmi = calculateBmi(values.vitals.weightKg, values.vitals.heightCm)
  return {
    state: 'draft', paperSize: normalizePrescriptionPaperSize(clinic?.default_paper_size), prescriptionNumber: null, date: formatDate(date),
    clinic: clinicData(clinic, assets), doctor: doctorData(profile, assets),
    patient: { name: `${context.patient.first_name} ${context.patient.last_name}`, age: ageAt(context.patient.date_of_birth, date), sex: context.patient.sex, patientId: context.patient.medical_record_number, phone: context.patient.phone },
    vitals: [
      values.vitals.systolicBp || values.vitals.diastolicBp ? `BP ${values.vitals.systolicBp || '-'}/${values.vitals.diastolicBp || '-'} mmHg` : '',
      values.vitals.pulseBpm ? `Pulse ${values.vitals.pulseBpm} bpm` : '', values.vitals.temperatureF ? `Temp ${values.vitals.temperatureF} °F` : '',
      values.vitals.oxygenSaturation ? `SpO₂ ${values.vitals.oxygenSaturation}%` : '', values.vitals.weightKg ? `Weight ${values.vitals.weightKg} kg` : '',
      values.vitals.heightCm ? `Height ${values.vitals.heightCm} cm` : '', values.vitals.respiratoryRate ? `RR ${values.vitals.respiratoryRate}/min` : '', bmi ? `BMI ${bmi}` : '',
    ].filter(Boolean),
    symptoms: values.complaints.map((item) => ({ primary: item.name, detail: item.durationValue ? `${item.durationValue} ${item.durationUnit}` : undefined, note: item.notes || undefined })),
    examination: draftExamination(values), diagnoses: values.diagnoses.map((item) => ({ primary: item.name, secondary: item.isPrimary ? 'Primary' : undefined, note: item.notes || undefined })),
    medicines: values.medicines.map((item) => ({ primary: medicationLabel(item), secondary: item.brandName && item.genericName ? [item.genericName, item.formulation].filter(Boolean).join(' · ') : item.formulation || undefined, detail: medicineSummary(item), note: item.instructions || undefined })),
    investigations: values.investigations, advice: values.advice, followUp: draftFollowUp(values),
  }
}

export function buildSavedPrescription(detail: ConsultationDetail, assets: PrescriptionAssetUrls = { logoUrl: null, signatureUrl: null }): PrescriptionDocumentData {
  const { visit, patient, vitals } = detail
  const bmi = vitals?.weight_kg && vitals.height_cm ? Math.round((vitals.weight_kg / ((vitals.height_cm / 100) ** 2)) * 10) / 10 : null
  return {
    state: 'saved', paperSize: normalizePrescriptionPaperSize(detail.clinic.default_paper_size), prescriptionNumber: visit.prescription_number, date: formatDate(visit.visited_at),
    clinic: clinicData(detail.clinic, assets), doctor: doctorData(detail.clinician, assets),
    patient: { name: `${patient.first_name} ${patient.last_name}`, age: ageAt(patient.date_of_birth, visit.visited_at), sex: patient.sex, patientId: patient.medical_record_number, phone: patient.phone },
    vitals: vitals ? [
      vitals.systolic_bp || vitals.diastolic_bp ? `BP ${vitals.systolic_bp ?? '-'}/${vitals.diastolic_bp ?? '-'} mmHg` : '',
      vitals.pulse_bpm ? `Pulse ${vitals.pulse_bpm} bpm` : '', vitals.temperature_c !== null ? `Temp ${Math.round((vitals.temperature_c * 9 / 5 + 32) * 10) / 10} °F` : '',
      vitals.oxygen_saturation !== null ? `SpO₂ ${vitals.oxygen_saturation}%` : '', vitals.weight_kg !== null ? `Weight ${vitals.weight_kg} kg` : '',
      vitals.height_cm !== null ? `Height ${vitals.height_cm} cm` : '', vitals.respiratory_rate ? `RR ${vitals.respiratory_rate}/min` : '', bmi ? `BMI ${bmi}` : '',
    ].filter(Boolean) : [],
    symptoms: detail.complaints.map((item) => ({ primary: item.symptom, detail: item.duration_value ? `${item.duration_value} ${item.duration_unit}` : undefined, note: item.notes ?? undefined })),
    examination: savedExamination(detail), diagnoses: detail.diagnoses.map((item) => ({ primary: item.diagnosis, secondary: item.is_primary ? 'Primary' : undefined, note: item.notes ?? undefined })),
    medicines: detail.medicines.map((item) => ({ primary: [item.brand_name || item.generic_name, item.strength].filter(Boolean).join(' '), secondary: item.brand_name && item.generic_name ? [item.generic_name, item.formulation].filter(Boolean).join(' · ') : item.formulation ?? undefined, detail: [item.dose_text || [item.dose_value, item.dose_unit].filter(Boolean).join(' '), item.frequency_text || item.frequency_code, item.food_timing === 'no_preference' ? null : item.food_timing.replaceAll('_', ' '), item.duration_text || (item.duration_value ? `${item.duration_value} ${item.duration_unit}` : null)].filter(Boolean).join(' · '), note: item.instructions ?? undefined })),
    investigations: detail.investigations.map((item) => item.investigation), advice: detail.advice.map((item) => item.advice), followUp: savedFollowUp(detail),
  }
}

export function sanitizePrescriptionFilename(patientName: string, visitedAt: string) {
  const safeName = patientName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'Patient'
  const date = new Date(visitedAt)
  const isoDate = Number.isNaN(date.getTime()) ? 'unknown-date' : date.toISOString().slice(0, 10)
  return `${safeName}_${isoDate}_Prescription.pdf`
}

export function printPrescription(filename: string, paperSize: PrescriptionPaperSize) {
  const previousTitle = document.title
  const style = document.createElement('style')
  style.dataset.prescriptionPage = 'true'
  style.textContent = `@page { size: ${normalizePrescriptionPaperSize(paperSize)} portrait; margin: 10mm; }`
  document.head.append(style)
  document.title = filename.replace(/\.pdf$/i, '')
  try { window.print() } finally { document.title = previousTitle; style.remove() }
}

export async function printPrescriptionWhenReady(filename: string, paperSize: PrescriptionPaperSize) {
  const images = [...document.querySelectorAll<HTMLImageElement>('.prescription-document img')]
  await Promise.all(images.map((image) => image.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })))
  printPrescription(filename, paperSize)
}
