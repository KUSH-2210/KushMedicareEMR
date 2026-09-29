import type { Patient, Visit } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import type { PatientFormValues } from './patientValidation'

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

function optional(value: string) {
  const trimmed = value.trim()
  return trimmed || null
}

export function normalizePatientSearch(query: string) {
  return query.trim().replace(/[^\p{L}\p{M}\p{N}\s+'-]/gu, '').slice(0, 80)
}

export function getPatientDataErrorMessage(error: unknown, fallback: string) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : ''

  if (code === '23505') return 'That medical record number is already in use.'
  if (code === '23514' || code === '22007') return 'Some patient details are invalid. Review the form and try again.'
  if (code === '42501' || code === 'PGRST301') return 'You do not have permission to access this patient record.'
  if (code === 'PGRST116') return 'Patient record not found.'
  return fallback
}

export function toPatientInsert(clinicId: string, userId: string, values: PatientFormValues) {
  if (!values.sex) {
    throw new Error('Sex is required.')
  }

  return {
    clinic_id: clinicId,
    created_by: userId,
    medical_record_number: values.medicalRecordNumber.trim().toUpperCase(),
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    date_of_birth: values.dateOfBirth,
    sex: values.sex,
    phone: optional(values.phone),
    email: optional(values.email),
    address: optional(values.address),
    emergency_contact_name: optional(values.emergencyContactName),
    emergency_contact_phone: optional(values.emergencyContactPhone),
  }
}

export async function searchPatients(clinicId: string, query: string) {
  const client = requireClient()
  let request = client
    .from('patients')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('updated_at', { ascending: false })
    .limit(30)

  const safeQuery = normalizePatientSearch(query)
  if (safeQuery) {
    request = request.or(
      `first_name.ilike.%${safeQuery}%,last_name.ilike.%${safeQuery}%,medical_record_number.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%`,
    )
  }

  const { data, error } = await request
  if (error) throw error
  return data
}

export async function createPatient(clinicId: string, userId: string, values: PatientFormValues) {
  const client = requireClient()
  const { data, error } = await client
    .from('patients')
    .insert(toPatientInsert(clinicId, userId, values))
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function getPatient(patientId: string) {
  const client = requireClient()
  const { data, error } = await client.from('patients').select('*').eq('id', patientId).single()
  if (error) throw error
  return data
}

export async function getPatientVisits(patientId: string) {
  const client = requireClient()
  const { data, error } = await client
    .from('visits')
    .select('*')
    .eq('patient_id', patientId)
    .order('visited_at', { ascending: false })
    .limit(25)
  if (error) throw error
  return data
}

export type { Patient, Visit }
