import { useEffect, useState, type FormEvent } from 'react'
import { Alert } from '../components/Alert'
import { useAuth } from '../features/auth/useAuth'
import {
  getPrescriptionAssetUrls,
  listClinicStaff,
  updateClinicStaffRole,
  updateClinicPrescriptionSettings,
  updateDoctorPrescriptionSettings,
  uploadClinicLogo,
  uploadDoctorSignature,
  validatePrivateImage,
} from '../features/settings/settingsService'
import type { Profile, StaffRole } from '../lib/database.types'
import '../features/settings/settings.css'

function safeSettingsError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (code === '42501' || code === 'PGRST301' || code === '403') return 'You do not have permission to change these settings.'
  if (code === '23505') return 'That registration number is already used in this clinic.'
  if (error instanceof Error && (error.message.startsWith('Use a ') || error.message.startsWith('Image must'))) return error.message
  return 'Settings could not be saved. Please try again.'
}

export function SettingsPage() {
  const { clinic, profile, refreshMembership } = useAuth()
  const [clinicValues, setClinicValues] = useState(() => ({
    prescriptionName: clinic?.prescription_name ?? '', address: clinic?.address ?? '', phone: clinic?.phone ?? '',
    email: clinic?.prescription_email ?? '', paperSize: clinic?.default_paper_size ?? 'A4' as 'A4' | 'A5', footer: clinic?.prescription_footer ?? '',
  }))
  const [doctorValues, setDoctorValues] = useState(() => ({
    displayName: profile?.display_name ?? '', qualification: profile?.qualification ?? '', specialization: profile?.specialization ?? '',
    registrationNumber: profile?.medical_registration_number ?? '', additionalCredentials: profile?.additional_credentials ?? '',
  }))
  const [assetUrls, setAssetUrls] = useState<{ logoUrl: string | null; signatureUrl: string | null }>({ logoUrl: null, signatureUrl: null })
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<Profile[]>([])

  useEffect(() => {
    if (!clinic || !profile) return
    let active = true
    void getPrescriptionAssetUrls(clinic, profile).then((urls) => { if (active) setAssetUrls(urls) }).catch(() => {})
    return () => { active = false }
  }, [clinic, profile])

  useEffect(() => {
    if (!clinic || !profile || !['owner', 'admin'].includes(profile.role)) return
    let active = true
    void listClinicStaff(clinic.id).then((members) => { if (active) setStaff(members) }).catch(() => {})
    return () => { active = false }
  }, [clinic, profile])

  if (!clinic || !profile) return null

  async function saveClinic(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError(null); setStatus(null)
    try {
      await updateClinicPrescriptionSettings(clinic!.id, clinicValues)
      await refreshMembership()
      setStatus('Clinic prescription settings saved.')
    } catch (caught) { setError(safeSettingsError(caught)) } finally { setSaving(false) }
  }

  async function saveDoctor(event: FormEvent) {
    event.preventDefault()
    setSaving(true); setError(null); setStatus(null)
    try {
      await updateDoctorPrescriptionSettings(profile!.id, doctorValues)
      await refreshMembership()
      setStatus('Doctor prescription settings saved.')
    } catch (caught) { setError(safeSettingsError(caught)) } finally { setSaving(false) }
  }

  async function upload(kind: 'logo' | 'signature', file: File | undefined) {
    if (!file) return
    const validationError = validatePrivateImage(file)
    if (validationError) { setError(validationError); return }
    setSaving(true); setError(null); setStatus(null)
    try {
      if (kind === 'logo') await uploadClinicLogo(clinic!.id, file)
      else await uploadDoctorSignature(clinic!.id, profile!.id, file)
      await refreshMembership()
      const refreshed = await getPrescriptionAssetUrls(
        { logo_path: kind === 'logo' ? `clinic/${clinic!.id}/logo/logo` : clinic!.logo_path },
        { signature_path: kind === 'signature' ? `clinic/${clinic!.id}/doctors/${profile!.id}/signature/signature` : profile!.signature_path },
      )
      setAssetUrls(refreshed)
      setStatus(kind === 'logo' ? 'Private clinic logo uploaded.' : 'Private signature uploaded.')
    } catch (caught) { setError(safeSettingsError(caught)) } finally { setSaving(false) }
  }

  async function changeRole(member: Profile, role: Exclude<StaffRole, 'staff'>) {
    setSaving(true); setError(null); setStatus(null)
    try {
      await updateClinicStaffRole(member.id, role)
      setStaff(await listClinicStaff(clinic!.id))
      setStatus(`${member.full_name}'s role was updated.`)
    } catch (caught) { setError(safeSettingsError(caught)) } finally { setSaving(false) }
  }

  return <section className="settings-page">
    <div className="page-heading page-heading--compact"><div><span className="eyebrow">Clinic administration</span><h1>Settings</h1><p>Manage clinic identity, prescription defaults, doctor details, and staff access.</p></div></div>
    {error && <Alert>{error}</Alert>}
    {status && <Alert tone="success">{status}</Alert>}
    <div className="settings-grid">
      <form className="settings-card" onSubmit={saveClinic}>
        <div className="card-heading"><h2>Clinic details</h2><span>Shared across this clinic</span></div>
        <label>Prescription display name<input value={clinicValues.prescriptionName} maxLength={160} placeholder={clinic.name} onChange={(event) => setClinicValues({ ...clinicValues, prescriptionName: event.target.value })} /></label>
        <label>Address<textarea rows={3} maxLength={1000} value={clinicValues.address} onChange={(event) => setClinicValues({ ...clinicValues, address: event.target.value })} /></label>
        <div className="settings-pair"><label>Phone<input value={clinicValues.phone} maxLength={50} onChange={(event) => setClinicValues({ ...clinicValues, phone: event.target.value })} /></label><label>Email<input type="email" value={clinicValues.email} maxLength={254} onChange={(event) => setClinicValues({ ...clinicValues, email: event.target.value })} /></label></div>
        <label>Default paper size<select value={clinicValues.paperSize} onChange={(event) => setClinicValues({ ...clinicValues, paperSize: event.target.value as 'A4' | 'A5' })}><option value="A4">A4</option><option value="A5">A5</option></select></label>
        <label>Footer text<textarea rows={3} maxLength={1000} value={clinicValues.footer} onChange={(event) => setClinicValues({ ...clinicValues, footer: event.target.value })} /></label>
        <button className="button button--primary" type="submit" disabled={saving}>Save clinic details</button>
        <div className="private-upload"><div><strong>Clinic logo</strong><span>Private PNG, JPEG, or WebP · maximum 2 MB</span></div>{assetUrls.logoUrl && <img src={assetUrls.logoUrl} alt="Current clinic logo" />}<label className="button button--secondary">Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void upload('logo', event.target.files?.[0])} /></label></div>
      </form>

      <form className="settings-card" onSubmit={saveDoctor}>
        <div className="card-heading"><h2>Doctor details</h2><span>Your prescription identity</span></div>
        <label>Full display name<input value={doctorValues.displayName} maxLength={160} placeholder={profile.full_name} onChange={(event) => setDoctorValues({ ...doctorValues, displayName: event.target.value })} /></label>
        <div className="settings-pair"><label>Qualification<input value={doctorValues.qualification} maxLength={200} placeholder="MBBS, MD" onChange={(event) => setDoctorValues({ ...doctorValues, qualification: event.target.value })} /></label><label>Specialization<input value={doctorValues.specialization} maxLength={200} onChange={(event) => setDoctorValues({ ...doctorValues, specialization: event.target.value })} /></label></div>
        <label>Medical registration number<input value={doctorValues.registrationNumber} maxLength={100} onChange={(event) => setDoctorValues({ ...doctorValues, registrationNumber: event.target.value })} /></label>
        <label>Additional credentials<textarea rows={3} maxLength={500} value={doctorValues.additionalCredentials} onChange={(event) => setDoctorValues({ ...doctorValues, additionalCredentials: event.target.value })} /></label>
        <button className="button button--primary" type="submit" disabled={saving}>Save doctor details</button>
        <div className="private-upload"><div><strong>Signature</strong><span>Private PNG, JPEG, or WebP · maximum 2 MB</span></div>{assetUrls.signatureUrl && <img className="signature-preview" src={assetUrls.signatureUrl} alt="Current doctor signature" />}<label className="button button--secondary">Upload signature<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void upload('signature', event.target.files?.[0])} /></label></div>
      </form>
    </div>
    {['owner', 'admin'].includes(profile.role) && <section className="settings-card staff-settings">
      <div className="card-heading"><div><h2>Team access</h2><span>Database-enforced roles for this clinic</span></div></div>
      <div className="staff-list">{staff.map((member) => <div className="staff-row" key={member.id}>
        <span className="avatar">{member.full_name[0]}</span><div><strong>{member.full_name}</strong><span>{member.id === profile.id ? 'Your account' : 'Clinic staff'}</span></div>
        <select aria-label={`Role for ${member.full_name}`} value={member.role === 'staff' ? 'reception' : member.role} disabled={saving || (profile.role === 'admin' && member.role === 'owner')} onChange={(event) => void changeRole(member, event.target.value as Exclude<StaffRole, 'staff'>)}>
          {profile.role === 'owner' && <option value="owner">Owner</option>}<option value="admin">Admin</option><option value="doctor">Doctor</option><option value="reception">Reception</option>
        </select>
      </div>)}</div>
      <p className="settings-note">New accounts still require a trusted Supabase Auth invitation and a clinic profile assignment. The browser never receives an administrative key.</p>
    </section>}
  </section>
}
