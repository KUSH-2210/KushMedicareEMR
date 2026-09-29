import type {
  ExaminationFinding,
  DoctorAdviceSnippet,
  DoctorMedicationPreference,
  Medication,
  PatientAllergy,
  Profile,
  PrescriptionItem,
  PrescriptionTemplate,
  PrescriptionTemplateAdvice,
  PrescriptionTemplateInvestigation,
  PrescriptionTemplateItem,
  Visit,
  VisitAdvice,
  VisitComplaint,
  VisitDiagnosis,
  VisitInvestigation,
  Vital,
} from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { buildConsultationPayload, buildMedicationPayload } from './consultationForm'
import type {
  ConsultationContext,
  ConsultationDetail,
  ConsultationFormValues,
  ConsultationHistoryItem,
  MedicineDraft,
  PrescriptionTemplateBundle,
} from './consultationTypes'

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export function getConsultationErrorMessage(error: unknown, fallback: string) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (code === 'PGRST205' || code === '42P01' || code === 'PGRST204') {
    return 'The consultation database is not up to date. Ask an administrator to apply the latest migration.'
  }
  if (code === '42501' || code === 'PGRST301') return 'You do not have permission to access this consultation.'
  if (code === '23503') return 'This patient record is no longer available.'
  if (code === '23505') return 'Only one primary diagnosis can be recorded.'
  if (code === '23514' || code === '22007' || code === '22P02') {
    return 'Some consultation details are invalid. Review the form and try again.'
  }
  if (code === 'PGRST116') return 'Consultation record not found.'
  return fallback
}

export async function getConsultationContext(patientId: string): Promise<ConsultationContext> {
  const client = requireClient()
  const [patientResult, allergyResult, visitResult, medicationResult, preferenceResult, templateResult, adviceResult] = await Promise.all([
    client.from('patients').select('*').eq('id', patientId).single(),
    client.from('patient_allergies').select('*').eq('patient_id', patientId).eq('is_active', true).order('allergen'),
    client.from('visits').select('*').eq('patient_id', patientId).order('visited_at', { ascending: false }).limit(20),
    client.from('medications').select('*'),
    client.from('doctor_medication_preferences').select('*'),
    client.from('prescription_templates').select('*').order('name'),
    client.from('doctor_advice_snippets').select('*').order('usage_count', { ascending: false }).limit(20),
  ])

  if (patientResult.error) throw patientResult.error
  if (allergyResult.error) throw allergyResult.error
  if (visitResult.error) throw visitResult.error
  if (medicationResult.error) throw medicationResult.error
  if (preferenceResult.error) throw preferenceResult.error
  if (templateResult.error) throw templateResult.error
  if (adviceResult.error) throw adviceResult.error

  const visitIds = visitResult.data.map((visit) => visit.id)
  const templateIds = templateResult.data.map((template) => template.id)
  const [previousMedicineResult, templateMedicineResult, templateInvestigationResult, templateAdviceResult] = await Promise.all([
    visitIds.length ? client.from('prescription_items').select('*').in('visit_id', visitIds).order('sort_order') : Promise.resolve({ data: [] as PrescriptionItem[], error: null }),
    templateIds.length ? client.from('prescription_template_items').select('*').in('template_id', templateIds).order('sort_order') : Promise.resolve({ data: [] as PrescriptionTemplateItem[], error: null }),
    templateIds.length ? client.from('prescription_template_investigations').select('*').in('template_id', templateIds).order('sort_order') : Promise.resolve({ data: [] as PrescriptionTemplateInvestigation[], error: null }),
    templateIds.length ? client.from('prescription_template_advice').select('*').in('template_id', templateIds).order('sort_order') : Promise.resolve({ data: [] as PrescriptionTemplateAdvice[], error: null }),
  ])
  if (previousMedicineResult.error) throw previousMedicineResult.error
  if (templateMedicineResult.error) throw templateMedicineResult.error
  if (templateInvestigationResult.error) throw templateInvestigationResult.error
  if (templateAdviceResult.error) throw templateAdviceResult.error

  const preferenceByMedication = new Map(preferenceResult.data.map((item) => [item.medication_id, item]))
  const previousVisitWithMedicine = visitResult.data.find((visit) => previousMedicineResult.data.some((item) => item.visit_id === visit.id))
  const templates: PrescriptionTemplateBundle[] = templateResult.data.map((template) => ({
    template,
    medicines: templateMedicineResult.data.filter((item) => item.template_id === template.id),
    investigations: templateInvestigationResult.data.filter((item) => item.template_id === template.id),
    advice: templateAdviceResult.data.filter((item) => item.template_id === template.id),
  }))
  return {
    patient: patientResult.data,
    allergies: allergyResult.data,
    previousVisit: visitResult.data[0] ?? null,
    medicationOptions: medicationResult.data.map((item) => ({ ...item, preference: preferenceByMedication.get(item.id) ?? null })),
    previousMedicines: previousVisitWithMedicine ? previousMedicineResult.data.filter((item) => item.visit_id === previousVisitWithMedicine.id) : [],
    templates,
    adviceSnippets: adviceResult.data,
  }
}

export async function saveConsultation(patientId: string, values: ConsultationFormValues) {
  const client = requireClient()
  const { data, error } = await client.rpc('create_consultation', buildConsultationPayload(patientId, values))
  if (error) throw error
  return data
}

export function assembleConsultationHistory(
  visits: Visit[],
  diagnoses: VisitDiagnosis[],
  complaints: VisitComplaint[],
  clinicians: Profile[],
  medicines: PrescriptionItem[] = [],
): ConsultationHistoryItem[] {
  const diagnosisByVisit = new Map(diagnoses.filter((item) => item.is_primary).map((item) => [item.visit_id, item]))
  const clinicianById = new Map(clinicians.map((item) => [item.id, item]))
  return visits.map((visit) => ({
    visit,
    primaryDiagnosis: diagnosisByVisit.get(visit.id) ?? null,
    complaints: complaints.filter((item) => item.visit_id === visit.id).sort((a, b) => a.sort_order - b.sort_order),
    clinician: clinicianById.get(visit.clinician_id) ?? null,
    medicineCount: medicines.filter((item) => item.visit_id === visit.id).length,
  }))
}

export async function getConsultationHistory(patientId: string): Promise<ConsultationHistoryItem[]> {
  const client = requireClient()
  const { data: visits, error } = await client
    .from('visits').select('*').eq('patient_id', patientId).order('visited_at', { ascending: false }).limit(50)
  if (error) throw error
  if (visits.length === 0) return []

  const visitIds = visits.map((visit) => visit.id)
  const clinicianIds = [...new Set(visits.map((visit) => visit.clinician_id))]
  const [diagnosisResult, complaintResult, profileResult, medicineResult] = await Promise.all([
    client.from('visit_diagnoses').select('*').in('visit_id', visitIds).order('sort_order'),
    client.from('visit_complaints').select('*').in('visit_id', visitIds).order('sort_order'),
    client.from('profiles').select('*').in('id', clinicianIds),
    client.from('prescription_items').select('*').in('visit_id', visitIds),
  ])
  if (diagnosisResult.error) throw diagnosisResult.error
  if (complaintResult.error) throw complaintResult.error
  if (profileResult.error) throw profileResult.error
  if (medicineResult.error) throw medicineResult.error
  return assembleConsultationHistory(visits, diagnosisResult.data, complaintResult.data, profileResult.data, medicineResult.data)
}

async function singleOrNull<T>(request: PromiseLike<{ data: T | null; error: unknown }>) {
  const result = await request
  if (result.error) throw result.error
  return result.data
}

export async function getConsultationDetail(visitId: string): Promise<ConsultationDetail> {
  const client = requireClient()
  const { data: visit, error } = await client.from('visits').select('*').eq('id', visitId).single()
  if (error) throw error

  const [clinic, patient, clinician, vitals, complaints, examination, diagnoses, medicines, investigations, advice] = await Promise.all([
    singleOrNull(client.from('clinics').select('*').eq('id', visit.clinic_id).single()),
    singleOrNull(client.from('patients').select('*').eq('id', visit.patient_id).single()),
    singleOrNull(client.from('profiles').select('*').eq('id', visit.clinician_id).maybeSingle()),
    singleOrNull(client.from('vitals').select('*').eq('visit_id', visitId).maybeSingle()),
    client.from('visit_complaints').select('*').eq('visit_id', visitId).order('sort_order').then(({ data, error }) => { if (error) throw error; return data }),
    singleOrNull(client.from('examination_findings').select('*').eq('visit_id', visitId).maybeSingle()),
    client.from('visit_diagnoses').select('*').eq('visit_id', visitId).order('sort_order').then(({ data, error }) => { if (error) throw error; return data }),
    client.from('prescription_items').select('*').eq('visit_id', visitId).order('sort_order').then(({ data, error }) => { if (error) throw error; return data }),
    client.from('visit_investigations').select('*').eq('visit_id', visitId).order('sort_order').then(({ data, error }) => { if (error) throw error; return data }),
    client.from('visit_advice').select('*').eq('visit_id', visitId).order('sort_order').then(({ data, error }) => { if (error) throw error; return data }),
  ])

  if (!patient || !clinic) throw new Error('Prescription record not found.')
  return {
    visit,
    clinic,
    patient,
    clinician: clinician as Profile | null,
    vitals: vitals as Vital | null,
    complaints: complaints as VisitComplaint[],
    examination: examination as ExaminationFinding | null,
    diagnoses: diagnoses as VisitDiagnosis[],
    medicines: medicines as PrescriptionItem[],
    investigations: investigations as VisitInvestigation[],
    advice: advice as VisitAdvice[],
  }
}

export async function setMedicationFavorite(medicationId: string, favorite: boolean) {
  const client = requireClient()
  const { error } = await client.rpc('set_medication_favorite', { p_medication_id: medicationId, p_is_favorite: favorite })
  if (error) throw error
}

export async function savePrescriptionTemplate(name: string, medicines: MedicineDraft[], investigations: string[], advice: string[]) {
  const client = requireClient()
  const { data, error } = await client.rpc('save_prescription_template', {
    p_name: name.trim(), p_medications: buildMedicationPayload(medicines), p_investigations: investigations, p_advice: advice,
  })
  if (error) throw error
  return data
}

export type { DoctorAdviceSnippet, DoctorMedicationPreference, Medication, PatientAllergy, PrescriptionItem, PrescriptionTemplate, VisitAdvice, VisitComplaint, VisitDiagnosis, VisitInvestigation }
