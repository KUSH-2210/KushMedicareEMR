import type {
  Appointment,
  GrowthMeasurement,
  Invoice,
  Medication,
  Patient,
  PatientDocument,
  PatientInvestigation,
  PatientVaccination,
  PrescriptionTemplate,
  Visit,
} from '../../lib/database.types'
import { supabase } from '../../lib/supabase'

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export type Named<T> = T & { patient?: Patient; clinicianName?: string }

function localDayRange(value = new Date()) {
  const start = new Date(value)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function getDashboardData(clinicId: string) {
  const api = client()
  const day = localDayRange()
  const upcomingEnd = new Date()
  upcomingEnd.setDate(upcomingEnd.getDate() + 8)
  const [patientResult, visitResult, appointmentResult, followUpResult] = await Promise.all([
    api.from('patients').select('*').eq('clinic_id', clinicId).order('updated_at', { ascending: false }).limit(6),
    api.from('visits').select('*').eq('clinic_id', clinicId).gte('visited_at', day.start).lt('visited_at', day.end).order('visited_at', { ascending: false }),
    api.from('appointments').select('*').eq('clinic_id', clinicId).gte('starts_at', day.start).lt('starts_at', day.end).order('starts_at'),
    api.from('visits').select('*').eq('clinic_id', clinicId).gte('follow_up_date', day.start.slice(0, 10)).lte('follow_up_date', upcomingEnd.toISOString().slice(0, 10)).order('follow_up_date').limit(8),
  ])
  for (const result of [patientResult, visitResult, followUpResult]) if (result.error) throw result.error
  const patients = patientResult.data ?? []
  const visits = visitResult.data ?? []
  const appointments = appointmentResult.error ? [] : (appointmentResult.data ?? [])
  const followUps = followUpResult.data ?? []
  const patientIds = [...new Set([
    ...visits.map((item) => item.patient_id),
    ...appointments.map((item) => item.patient_id),
    ...followUps.map((item) => item.patient_id),
  ])]
  const people = patientIds.length ? await api.from('patients').select('*').in('id', patientIds) : { data: [] as Patient[], error: null }
  if (people.error) throw people.error
  const byId = new Map(people.data.map((item) => [item.id, item]))
  return {
    recentPatients: patients,
    consultations: visits.map((item) => ({ ...item, patient: byId.get(item.patient_id) })),
    appointments: appointments.map((item) => ({ ...item, patient: byId.get(item.patient_id) })),
    followUps: followUps.map((item) => ({ ...item, patient: byId.get(item.patient_id) })),
  }
}

async function attachPatients<T extends { patient_id: string }>(rows: T[]): Promise<Named<T>[]> {
  if (!rows.length) return []
  const api = client()
  const ids = [...new Set(rows.map((item) => item.patient_id))]
  const { data, error } = await api.from('patients').select('*').in('id', ids)
  if (error) throw error
  const byId = new Map(data.map((item) => [item.id, item]))
  return rows.map((item) => ({ ...item, patient: byId.get(item.patient_id) }))
}

export async function listAppointments(from?: string, to?: string) {
  const api = client()
  const day = localDayRange()
  const { data, error } = await api.from('appointments').select('*')
    .gte('starts_at', from ?? day.start).lt('starts_at', to ?? day.end).order('starts_at')
  if (error) throw error
  return attachPatients(data)
}

export async function updateAppointmentStatus(id: string, status: Appointment['status']) {
  const api = client()
  const { data, error } = await api.from('appointments').update({ status }).eq('id', id).select('*').single()
  if (error) throw error
  await api.rpc('record_audit_event', { p_action: `appointment.${status}`, p_entity_type: 'appointment', p_entity_id: id })
  return data
}

export async function createAppointment(input: Pick<Appointment, 'clinic_id' | 'patient_id' | 'clinician_id' | 'starts_at' | 'visit_type' | 'notes' | 'created_by'>) {
  const api = client()
  const { data, error } = await api.from('appointments').insert(input).select('*').single()
  if (error) throw error
  await api.rpc('record_audit_event', { p_action: 'appointment.created', p_entity_type: 'appointment', p_entity_id: data.id })
  return data
}

export async function listVisits(limit = 75) {
  const api = client()
  const { data, error } = await api.from('visits').select('*').order('visited_at', { ascending: false }).limit(limit)
  if (error) throw error
  return attachPatients(data)
}

export async function listPrescriptions() {
  const api = client()
  const { data, error } = await api.from('visits').select('*').not('prescription_number', 'is', null).order('visited_at', { ascending: false }).limit(100)
  if (error) throw error
  return attachPatients(data)
}

export async function listVaccinations() {
  const api = client()
  const { data, error } = await api.from('patient_vaccinations').select('*').order('due_date').limit(100)
  if (error) throw error
  return attachPatients(data)
}

export async function listInvestigations() {
  const api = client()
  const { data, error } = await api.from('patient_investigations').select('*').order('ordered_at', { ascending: false }).limit(100)
  if (error) throw error
  return attachPatients(data)
}

export async function listInvoices() {
  const api = client()
  const { data, error } = await api.from('invoices').select('*').order('issued_at', { ascending: false }).limit(100)
  if (error) throw error
  return attachPatients(data)
}

export async function listMedicines() {
  const { data, error } = await client().from('medications').select('*').order('brand_name').limit(250)
  if (error) throw error
  return data
}

export async function saveMedicine(input: Pick<Medication, 'clinic_id' | 'created_by'> & Partial<Medication>) {
  const api = client()
  const { id, ...values } = input
  const result = id
    ? await api.from('medications').update({ brand_name: values.brand_name, generic_name: values.generic_name, formulation: values.formulation, strength: values.strength, manufacturer: values.manufacturer, is_active: values.is_active }).eq('id', id).select('*').single()
    : await api.from('medications').insert({ clinic_id: values.clinic_id, created_by: values.created_by, brand_name: values.brand_name, generic_name: values.generic_name, formulation: values.formulation, strength: values.strength, manufacturer: values.manufacturer, is_active: values.is_active }).select('*').single()
  const { data, error } = result
  if (error) throw error
  await api.rpc('record_audit_event', { p_action: id ? 'medicine.updated' : 'medicine.created', p_entity_type: 'medication', p_entity_id: data.id })
  return data
}

export async function listTemplates() {
  const { data, error } = await client().from('prescription_templates').select('*').order('usage_count', { ascending: false })
  if (error) throw error
  return data
}

export async function getPatientPortalData(patientId: string) {
  const api = client()
  const visitResult = await api.from('visits').select('id').eq('patient_id', patientId)
  if (visitResult.error) throw visitResult.error
  const visitIds = (visitResult.data ?? []).map((visit) => visit.id)
  const [allergies, vitals, investigations, vaccinations, growth, documents, invoices] = await Promise.all([
    api.from('patient_allergies').select('*').eq('patient_id', patientId).eq('is_active', true).order('allergen'),
    visitIds.length ? api.from('vitals').select('*').in('visit_id', visitIds).order('recorded_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    api.from('patient_investigations').select('*').eq('patient_id', patientId).order('ordered_at', { ascending: false }),
    api.from('patient_vaccinations').select('*').eq('patient_id', patientId).order('due_date'),
    api.from('patient_growth_measurements').select('*').eq('patient_id', patientId).order('measured_at'),
    api.from('patient_documents').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
    api.from('invoices').select('*').eq('patient_id', patientId).order('issued_at', { ascending: false }),
  ])
  for (const result of [allergies, vitals, investigations, vaccinations, growth, documents, invoices]) if (result.error) throw result.error
  return { allergies: allergies.data ?? [], vitals: vitals.data ?? [], investigations: investigations.data ?? [], vaccinations: vaccinations.data ?? [], growth: growth.data ?? [], documents: documents.data ?? [], invoices: invoices.data ?? [] }
}

export async function addVaccination(input: Pick<PatientVaccination, 'clinic_id' | 'patient_id' | 'vaccine_name' | 'created_by'> & Partial<PatientVaccination>) {
  const { data, error } = await client().from('patient_vaccinations').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function addInvestigation(input: Pick<PatientInvestigation, 'clinic_id' | 'patient_id' | 'name' | 'created_by'> & Partial<PatientInvestigation>) {
  const { data, error } = await client().from('patient_investigations').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function addGrowthMeasurement(input: Pick<GrowthMeasurement, 'clinic_id' | 'patient_id' | 'recorded_by'> & Partial<GrowthMeasurement>) {
  const { data, error } = await client().from('patient_growth_measurements').insert(input).select('*').single()
  if (error) throw error
  return data
}

export async function createInvoice(input: Pick<Invoice, 'clinic_id' | 'patient_id' | 'invoice_number' | 'created_by'> & Partial<Invoice>) {
  const { data, error } = await client().from('invoices').insert(input).select('*').single()
  if (error) throw error
  return data
}

const allowedDocumentTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])

export async function uploadPatientDocument(clinicId: string, patientId: string, userId: string, title: string, file: File) {
  if (!allowedDocumentTypes.has(file.type)) throw new Error('Use a PDF, PNG, JPEG, or WebP file.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Document must be 10 MB or smaller.')
  const api = client()
  const extension = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'file'
  const id = crypto.randomUUID()
  const path = `clinic/${clinicId}/patients/${patientId}/${id}.${extension}`
  const upload = await api.storage.from('patient-documents').upload(path, file, { contentType: file.type })
  if (upload.error) throw upload.error
  const { data, error } = await api.from('patient_documents').insert({
    clinic_id: clinicId, patient_id: patientId, title: title.trim(), storage_path: path,
    content_type: file.type, size_bytes: file.size, uploaded_by: userId,
  }).select('*').single()
  if (error) {
    await api.storage.from('patient-documents').remove([path])
    throw error
  }
  return data
}

export async function openPatientDocument(item: PatientDocument) {
  const { data, error } = await client().storage.from('patient-documents').createSignedUrl(item.storage_path, 120)
  if (error) throw error
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

export type PortalVisit = Named<Visit>
export type PortalAppointment = Named<Appointment>
export type PortalVaccination = Named<PatientVaccination>
export type PortalInvestigation = Named<PatientInvestigation>
export type PortalInvoice = Named<Invoice>
export type { PrescriptionTemplate }
