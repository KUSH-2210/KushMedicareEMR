import { useEffect, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { Icon } from '../components/Icon'
import { ConsultationWorkspace } from '../features/consultations/components/ConsultationWorkspace'
import type { ConsultationTab } from '../features/consultations/consultationTabs'
import { emptyConsultation, validateConsultation, type ConsultationErrors } from '../features/consultations/consultationForm'
import { getConsultationContext, getConsultationErrorMessage, saveConsultation, savePrescriptionTemplate, setMedicationFavorite } from '../features/consultations/consultationService'
import type { ConsultationContext, ConsultationFormValues, PrescriptionTemplateBundle } from '../features/consultations/consultationTypes'
import { medicineFromStored } from '../features/consultations/medicationUtils'
import { useAuth } from '../features/auth/useAuth'
import { getPrescriptionAssetUrls } from '../features/settings/settingsService'
import type { PrescriptionAssetUrls } from '../features/prescriptions/prescriptionUtils'
import { saveBeforePrint } from '../features/prescriptions/savePrintWorkflow'
import '../features/consultations/consultation.css'

function ageFromDate(value: string) {
  const birth = new Date(`${value}T00:00:00`)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1
  return age
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function freshConsultation() {
  return structuredClone(emptyConsultation)
}

export function ConsultationPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { clinic, profile } = useAuth()
  const [context, setContext] = useState<ConsultationContext | null>(null)
  const [values, setValues] = useState<ConsultationFormValues>(freshConsultation)
  const [errors, setErrors] = useState<ConsultationErrors>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadedPatientId, setLoadedPatientId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<ConsultationTab>('symptoms')
  const [prescriptionAssets, setPrescriptionAssets] = useState<PrescriptionAssetUrls>({ logoUrl: null, signatureUrl: null })
  const blocker = useBlocker(dirty && !saving)

  useEffect(() => {
    if (!patientId) return
    let active = true
    void getConsultationContext(patientId)
      .then((result) => { if (active) { setContext(result); setLoadError(null) } })
      .catch((error: unknown) => { if (active) setLoadError(getConsultationErrorMessage(error, 'Unable to load the consultation. Please try again.')) })
      .finally(() => { if (active) setLoadedPatientId(patientId) })
    return () => { active = false }
  }, [patientId])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    if (!clinic || !profile) return
    let active = true
    void getPrescriptionAssetUrls(clinic, profile).then((assets) => { if (active) setPrescriptionAssets(assets) }).catch(() => {})
    return () => { active = false }
  }, [clinic, profile])

  const allergies = context?.allergies.map((item) => `${item.allergen}${item.reaction ? ` (${item.reaction})` : ''}`).join(', ') || 'None recorded'

  function change<K extends keyof ConsultationFormValues>(key: K, value: ConsultationFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setDirty(true)
    setErrors((current) => {
      const next = { ...current }
      if (key === 'diagnoses') delete next.diagnoses
      if (key === 'followUp') delete next.followUp
      if (key === 'complaints') Object.keys(next).filter((errorKey) => errorKey.startsWith('complaint.')).forEach((errorKey) => delete next[errorKey])
      if (key === 'medicines') Object.keys(next).filter((errorKey) => errorKey.startsWith('medicine.')).forEach((errorKey) => delete next[errorKey])
      if (key === 'vitals') Object.keys(emptyConsultation.vitals).forEach((errorKey) => delete next[errorKey])
      return next
    })
  }

  async function persist(printAfterSave: boolean) {
    if (!patientId || saving) return
    const nextErrors = validateConsultation(values)
    setErrors(nextErrors)
    setSaveError(null)
    if (Object.keys(nextErrors).length > 0) {
      setSaveError('Review the highlighted fields before saving.')
      if (Object.keys(nextErrors).some((key) => key.startsWith('medicine.'))) setActiveTab('medicines')
      else if (nextErrors.diagnoses) setActiveTab('diagnosis')
      else if (nextErrors.followUp) setActiveTab('follow-up')
      else if (Object.keys(nextErrors).some((key) => key.startsWith('complaint.'))) setActiveTab('symptoms')
      else setActiveTab('vitals')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSaving(true)
    try {
      if (printAfterSave) {
        await saveBeforePrint(
          () => saveConsultation(patientId, values),
          (visitId) => {
            setDirty(false)
            navigate(`/app/patients/${patientId}/consultations/${visitId}?print=1`, { replace: true, state: { consultationSaved: true } })
          },
        )
      } else {
        await saveConsultation(patientId, values)
        setDirty(false)
        navigate(`/app/patients/${patientId}`, { replace: true, state: { consultationSaved: true } })
      }
    } catch (error) {
      setSaveError(getConsultationErrorMessage(error, 'The consultation could not be saved. No partial record was created.'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    void persist(false)
  }

  if (loadedPatientId !== patientId) return <div className="loading-panel"><span className="inline-loader" /> Loading consultation…</div>
  if (loadError || !context || !patientId) return <section><Link className="back-link" to={patientId ? `/app/patients/${patientId}` : '/app/patients'}><Icon name="arrow" /> Back to patient</Link><Alert>{loadError ?? 'Patient record not found.'}</Alert></section>

  const { patient, previousVisit } = context
  async function favoriteMedication(medicationId: string, favorite: boolean) {
    try {
      await setMedicationFavorite(medicationId, favorite)
      setContext((current) => current ? { ...current, medicationOptions: current.medicationOptions.map((item) => item.id === medicationId ? { ...item, preference: item.preference ? { ...item.preference, is_favorite: favorite } : { clinic_id: item.clinic_id, doctor_id: profile?.id ?? '', medication_id: item.id, usage_count: 0, last_used_at: null, is_favorite: favorite, updated_at: new Date().toISOString() } } : item) } : current)
    } catch (error) {
      setSaveError(getConsultationErrorMessage(error, 'Could not update the medicine favorite.'))
    }
  }

  function applyTemplate(template: PrescriptionTemplateBundle) {
    change('medicines', [...values.medicines, ...template.medicines.map(medicineFromStored)])
    change('investigations', [...new Set([...values.investigations, ...template.investigations.map((item) => item.investigation)])])
    change('advice', [...new Set([...values.advice, ...template.advice.map((item) => item.advice)])])
  }

  async function saveTemplate(name: string) {
    try {
      await savePrescriptionTemplate(name, values.medicines, values.investigations, values.advice)
      setContext(await getConsultationContext(patient.id))
    } catch (error) {
      throw new Error(getConsultationErrorMessage(error, 'Template could not be saved.'), { cause: error })
    }
  }

  return <section className="consultation-page">
    <header className="consultation-header">
      <div><span className="eyebrow">New consultation</span><h1>{patient.first_name} {patient.last_name}</h1><p>{ageFromDate(patient.date_of_birth)}y · {patient.sex}</p></div>
      <dl><div><dt>Allergy</dt><dd className={context.allergies.length ? 'allergy-warning' : ''}>{allergies}</dd></div><div><dt>Last visit</dt><dd>{previousVisit ? formatDateTime(previousVisit.visited_at) : 'No previous visit'}</dd></div></dl>
      <Link className="button button--secondary compact-history-link" to={`/app/patients/${patient.id}#consultation-history`}>Previous visits</Link>
    </header>
    <form className="consultation-form" onSubmit={submit}>
      {saveError && <Alert>{saveError}</Alert>}
      <ConsultationWorkspace activeTab={activeTab} onActiveTab={setActiveTab} context={context} values={values} errors={errors} clinic={clinic} profile={profile} prescriptionAssets={prescriptionAssets} onChange={change} onFavorite={favoriteMedication} onApplyTemplate={applyTemplate} onSaveTemplate={saveTemplate} />
      <div className="consultation-actions"><span>{dirty ? 'Unsaved changes · preview is not printable' : 'Ready to record'}</span><Link className="button button--secondary" to={`/app/patients/${patient.id}`}>Cancel</Link><button className="button button--secondary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save consultation'}</button><button className="button button--primary" type="button" disabled={saving} onClick={() => void persist(true)}>{saving ? <><span className="inline-loader" /> Saving…</> : 'Save & Print'}</button></div>
    </form>
    {blocker.state === 'blocked' && <div className="discard-bar" role="alertdialog" aria-label="Unsaved consultation"><div><strong>Discard this consultation?</strong><span>Your unsaved clinical entries will be lost.</span></div><button type="button" className="button button--secondary" onClick={() => blocker.reset()}>Keep editing</button><button type="button" className="button button--primary" onClick={() => blocker.proceed()}>Discard</button></div>}
  </section>
}
