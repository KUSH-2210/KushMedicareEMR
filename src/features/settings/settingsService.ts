import type { Clinic, Profile } from '../../lib/database.types'
import type { StaffRole } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'

const assetBucket = 'clinic-assets'
const permittedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const maxImageBytes = 2 * 1024 * 1024

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function optional(value: string) {
  return value.trim() || null
}

export function validatePrivateImage(file: File) {
  if (!permittedImageTypes.has(file.type)) return 'Use a PNG, JPEG, or WebP image.'
  if (file.size > maxImageBytes) return 'Image must be 2 MB or smaller.'
  return null
}

async function uploadPrivateImage(path: string, file: File) {
  const validationError = validatePrivateImage(file)
  if (validationError) throw new Error(validationError)
  const client = requireClient()
  const { error } = await client.storage.from(assetBucket).upload(path, file, {
    cacheControl: '3600', contentType: file.type, upsert: true,
  })
  if (error) throw error
  return path
}

export async function updateClinicPrescriptionSettings(
  clinicId: string,
  values: { prescriptionName: string; address: string; phone: string; email: string; paperSize: 'A4' | 'A5'; footer: string },
) {
  const client = requireClient()
  const { data, error } = await client.from('clinics').update({
    prescription_name: optional(values.prescriptionName),
    address: optional(values.address),
    phone: optional(values.phone),
    prescription_email: optional(values.email),
    default_paper_size: values.paperSize,
    prescription_footer: optional(values.footer),
  }).eq('id', clinicId).select('*').single()
  if (error) throw error
  return data
}

export async function updateDoctorPrescriptionSettings(
  doctorId: string,
  values: { displayName: string; qualification: string; specialization: string; registrationNumber: string; additionalCredentials: string },
) {
  const client = requireClient()
  const { data, error } = await client.from('profiles').update({
    display_name: optional(values.displayName),
    qualification: optional(values.qualification),
    specialization: optional(values.specialization),
    medical_registration_number: optional(values.registrationNumber),
    additional_credentials: optional(values.additionalCredentials),
  }).eq('id', doctorId).select('*').single()
  if (error) throw error
  return data
}

export async function uploadClinicLogo(clinicId: string, file: File) {
  const path = `clinic/${clinicId}/logo/logo`
  await uploadPrivateImage(path, file)
  const client = requireClient()
  const { data, error } = await client.from('clinics').update({ logo_path: path }).eq('id', clinicId).select('*').single()
  if (error) throw error
  return data
}

export async function uploadDoctorSignature(clinicId: string, doctorId: string, file: File) {
  const path = `clinic/${clinicId}/doctors/${doctorId}/signature/signature`
  await uploadPrivateImage(path, file)
  const client = requireClient()
  const { data, error } = await client.from('profiles').update({ signature_path: path }).eq('id', doctorId).select('*').single()
  if (error) throw error
  return data
}

async function signedAssetUrl(path: string | null) {
  if (!path) return null
  const client = requireClient()
  const { data, error } = await client.storage.from(assetBucket).createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

export async function getPrescriptionAssetUrls(clinic: Pick<Clinic, 'logo_path'>, doctor: Pick<Profile, 'signature_path'> | null) {
  const [logoUrl, signatureUrl] = await Promise.all([
    signedAssetUrl(clinic.logo_path),
    signedAssetUrl(doctor?.signature_path ?? null),
  ])
  return { logoUrl, signatureUrl }
}

export async function listClinicStaff(clinicId: string) {
  const client = requireClient()
  const { data, error } = await client.from('profiles').select('*').eq('clinic_id', clinicId).order('full_name')
  if (error) throw error
  return data
}

export async function updateClinicStaffRole(profileId: string, role: Exclude<StaffRole, 'staff'>) {
  const client = requireClient()
  const { error } = await client.rpc('update_staff_role', { p_profile_id: profileId, p_role: role })
  if (error) throw error
}
