import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { Icon } from '../components/Icon'
import { getConsultationErrorMessage, getConsultationHistory } from '../features/consultations/consultationService'
import type { ConsultationHistoryItem } from '../features/consultations/consultationTypes'
import { getPatient, getPatientDataErrorMessage, type Patient } from '../features/patients/patientService'
import { useAuth } from '../features/auth/useAuth'
import { PatientQuickAction, type PatientAction } from '../features/portal/PatientQuickAction'
import { getPatientPortalData, openPatientDocument, uploadPatientDocument } from '../features/portal/portalService'

type PortalData = Awaited<ReturnType<typeof getPatientPortalData>>
const emptyPortalData: PortalData = { allergies: [], vitals: [], investigations: [], vaccinations: [], growth: [], documents: [], invoices: [] }
type Tab = 'overview' | 'timeline' | 'prescriptions' | 'vitals' | 'investigations' | 'vaccinations' | 'growth' | 'documents' | 'billing'
const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'timeline', label: 'Timeline' }, { id: 'prescriptions', label: 'Prescriptions' },
  { id: 'vitals', label: 'Vitals' }, { id: 'investigations', label: 'Investigations' }, { id: 'vaccinations', label: 'Vaccinations' },
  { id: 'growth', label: 'Growth' }, { id: 'documents', label: 'Documents' }, { id: 'billing', label: 'Billing' },
]

function displayDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(withTime ? value : `${value}T00:00:00`))
}

function ageFromDate(value: string) {
  const birth = new Date(`${value}T00:00:00`); const now = new Date(); let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1
  return age
}

function Empty({ text }: { text: string }) { return <div className="card-empty"><Icon name="file" /><strong>No records yet</strong><p>{text}</p></div> }

function GrowthChart({ data }: { data: PortalData['growth'] }) {
  const values = data.filter((item) => item.weight_kg !== null)
  if (values.length < 2) return <Empty text="Add at least two weight measurements to see the trend." />
  const weights = values.map((item) => Number(item.weight_kg)); const min = Math.min(...weights); const max = Math.max(...weights)
  const points = weights.map((weight, index) => `${20 + (index * 560) / Math.max(values.length - 1, 1)},${170 - ((weight - min) / Math.max(max - min, 1)) * 130}`).join(' ')
  return <div className="growth-chart"><svg viewBox="0 0 600 200" role="img" aria-label="Recorded weight trend"><path d="M20 170H580M20 40V170" /><polyline points={points} /><g>{points.split(' ').map((point) => { const [cx, cy] = point.split(','); return <circle key={point} cx={cx} cy={cy} r="5" /> })}</g></svg><p>Recorded values only. No percentile or clinical interpretation is applied.</p></div>
}

export function PatientProfilePage() {
  const { profile, clinic } = useAuth(); const { patientId } = useParams(); const location = useLocation()
  const [patient, setPatient] = useState<Patient | null>(null); const [history, setHistory] = useState<ConsultationHistoryItem[]>([])
  const [portal, setPortal] = useState<PortalData | null>(null); const [error, setError] = useState<string | null>(null)
  const [loadedPatientId, setLoadedPatientId] = useState<string | null>(null); const [tab, setTab] = useState<Tab>('overview')
  const [action, setAction] = useState<PatientAction | null>(null); const [uploading, setUploading] = useState(false)
  const state = location.state as { created?: boolean; consultationSaved?: boolean } | null; const loading = loadedPatientId !== patientId
  const clinicalRole = profile && ['owner', 'admin', 'doctor'].includes(profile.role)
  const visibleTabs = clinicalRole ? tabs : tabs.filter((item) => item.id === 'overview' || item.id === 'billing')

  const load = useCallback(async () => {
    if (!patientId) return
    try {
      const [patientData, historyData, portalData] = await Promise.all([getPatient(patientId), getConsultationHistory(patientId), getPatientPortalData(patientId).catch(() => emptyPortalData)])
      setPatient(patientData); setHistory(historyData); setPortal(portalData); setError(null)
    } catch (caughtError) {
      setError(getConsultationErrorMessage(caughtError, getPatientDataErrorMessage(caughtError, 'Unable to load the patient record. Please try again.')))
    } finally { setLoadedPatientId(patientId) }
  }, [patientId])

  useEffect(() => { queueMicrotask(() => void load()) }, [load])
  const prescriptions = useMemo(() => history.filter((item) => item.visit.prescription_number), [history])

  async function upload(file?: File) {
    if (!file || !clinic || !profile || !patientId) return
    setUploading(true); setError(null)
    try { await uploadPatientDocument(clinic.id, patientId, profile.id, file.name.replace(/\.[^.]+$/, ''), file); await load() }
    catch { setError('The document could not be uploaded. Use a PDF or image up to 10 MB.') }
    finally { setUploading(false) }
  }

  if (loading) return <div className="loading-panel"><span className="inline-loader" /> Loading patient record…</div>
  if (error && !patient) return <section><Link className="back-link" to="/app/patients"><Icon name="arrow" /> Back to patients</Link><Alert>{error}</Alert></section>
  if (!patient) return null

  return <section className="patient-workspace">
    <Link className="back-link" to="/app/patients"><Icon name="arrow" /> Back to patients</Link>
    {error && <Alert>{error}</Alert>}{state?.created && <Alert tone="success">Patient record created successfully.</Alert>}{state?.consultationSaved && <Alert tone="success">Consultation saved successfully.</Alert>}
    <div className="patient-hero patient-hero--actions">
      <span className="patient-avatar patient-avatar--large">{patient.first_name[0]}{patient.last_name[0]}</span>
      <div><span className="eyebrow">MRN {patient.medical_record_number}</span><h1>{patient.first_name} {patient.last_name}</h1><p>{ageFromDate(patient.date_of_birth)} years · {patient.sex}{patient.blood_group ? ` · ${patient.blood_group}` : ''}</p></div>
      <div className="patient-hero__actions"><button className="button button--secondary" onClick={() => setAction('appointment')}><Icon name="calendar" /> Book</button>{clinicalRole && <Link className="button button--primary" to={`/app/patients/${patient.id}/consultations/new`}><Icon name="plus" /> New consultation</Link>}</div>
    </div>
    {clinicalRole && (portal?.allergies.length || patient.high_risk_notes) ? <div className="clinical-alerts"><strong>Clinical alerts</strong>{portal?.allergies.map((item) => <span key={item.id}>{item.allergen}{item.severity !== 'unknown' ? ` · ${item.severity}` : ''}</span>)}{patient.high_risk_notes && <span>{patient.high_risk_notes}</span>}</div> : null}
    <div className="patient-tabs" role="tablist" aria-label="Patient record sections">{visibleTabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
    <article className="patient-tab-panel" role="tabpanel">
      {tab === 'overview' && <div className="profile-grid">
        <section className="detail-card"><div className="card-heading"><h2>Patient details</h2><span>Demographics</span></div><dl className="detail-list"><div><dt>Date of birth</dt><dd>{displayDate(patient.date_of_birth)}</dd></div><div><dt>Phone</dt><dd>{patient.phone ?? 'Not provided'}</dd></div><div><dt>Email</dt><dd>{patient.email ?? 'Not provided'}</dd></div><div><dt>Address</dt><dd>{patient.address ?? 'Not provided'}</dd></div><div><dt>Chronic conditions</dt><dd>{patient.chronic_conditions?.length ? patient.chronic_conditions.join(', ') : 'None recorded'}</dd></div></dl></section>
        <section className="detail-card"><div className="card-heading"><h2>Clinical summary</h2><span>Latest records</span></div><dl className="detail-list"><div><dt>Consultations</dt><dd>{history.length}</dd></div><div><dt>Last visit</dt><dd>{history[0] ? displayDate(history[0].visit.visited_at, true) : 'No visits'}</dd></div><div><dt>Active allergies</dt><dd>{portal?.allergies.map((item) => item.allergen).join(', ') || 'None recorded'}</dd></div><div><dt>Open investigations</dt><dd>{portal?.investigations.filter((item) => !['reviewed', 'cancelled'].includes(item.status)).length ?? 0}</dd></div><div><dt>Outstanding balance</dt><dd>₹{portal?.invoices.reduce((sum, item) => sum + Math.max(Number(item.total) - Number(item.amount_paid), 0), 0).toFixed(2) ?? '0.00'}</dd></div></dl></section>
      </div>}
      {tab === 'timeline' && (history.length ? <div className="timeline">{history.map((item) => <Link key={item.visit.id} to={`/app/patients/${patient.id}/consultations/${item.visit.id}`}><time>{displayDate(item.visit.visited_at, true)}</time><div><strong>{item.primaryDiagnosis?.diagnosis ?? item.visit.reason}</strong><p>{item.complaints.map((complaint) => complaint.symptom).join(', ') || 'No presenting complaints recorded.'}</p><span>{item.clinician?.full_name ?? 'Clinic doctor'} · {item.medicineCount} medicines</span></div></Link>)}</div> : <Empty text="Start the patient’s first consultation." />)}
      {tab === 'prescriptions' && (prescriptions.length ? <div className="data-table">{prescriptions.map((item) => <div className="data-row" key={item.visit.id}><span className="data-row__icon"><Icon name="file" /></span><div className="data-row__main"><strong>{item.visit.prescription_number}</strong><span>{item.primaryDiagnosis?.diagnosis ?? item.visit.reason}</span></div><span className="data-row__meta">{displayDate(item.visit.visited_at, true)}</span><Link className="row-link" to={`/app/patients/${patient.id}/consultations/${item.visit.id}`}>Open <Icon name="arrow" size={16} /></Link></div>)}</div> : <Empty text="Saved prescriptions will appear here." />)}
      {tab === 'vitals' && (portal?.vitals.length ? <div className="record-card-grid">{portal.vitals.map((item) => <section key={item.id}><time>{displayDate(item.recorded_at, true)}</time><strong>{item.weight_kg ? `${item.weight_kg} kg` : 'Weight —'}</strong><span>{item.systolic_bp ? `${item.systolic_bp}/${item.diastolic_bp} mmHg` : 'BP —'} · {item.temperature_c ? `${item.temperature_c} °C` : 'Temp —'}</span></section>)}</div> : <Empty text="Vitals saved during consultations will appear here." />)}
      {tab === 'investigations' && <><div className="tab-actions">{clinicalRole && <button className="button button--primary" onClick={() => setAction('investigation')}><Icon name="plus" /> Order investigation</button>}</div>{portal?.investigations.length ? <div className="data-table">{portal.investigations.map((item) => <div className="data-row" key={item.id}><span className="data-row__icon"><Icon name="flask" /></span><div className="data-row__main"><strong>{item.name}</strong><span>{item.result_summary || 'No result recorded'}</span></div><span className="data-row__meta">{displayDate(item.ordered_at, true)}</span><span className={`status-badge status-badge--${item.status}`}>{item.status.replace('_', ' ')}</span></div>)}</div> : <Empty text="Orders and results will appear here." />}</>}
      {tab === 'vaccinations' && <><div className="tab-actions">{clinicalRole && <button className="button button--primary" onClick={() => setAction('vaccination')}><Icon name="plus" /> Record vaccination</button>}</div>{portal?.vaccinations.length ? <div className="data-table">{portal.vaccinations.map((item) => <div className="data-row" key={item.id}><span className="data-row__icon"><Icon name="syringe" /></span><div className="data-row__main"><strong>{item.vaccine_name}</strong><span>{item.dose_label || 'Dose not specified'}{item.batch_number ? ` · Batch ${item.batch_number}` : ''}</span></div><span className="data-row__meta">{item.administered_at ? displayDate(item.administered_at, true) : item.due_date ? `Due ${displayDate(item.due_date)}` : ''}</span><span className={`status-badge status-badge--${item.status}`}>{item.status}</span></div>)}</div> : <Empty text="Vaccination history and due doses will appear here." />}</>}
      {tab === 'growth' && <><div className="tab-actions">{clinicalRole && <button className="button button--primary" onClick={() => setAction('growth')}><Icon name="plus" /> Add measurement</button>}</div><GrowthChart data={portal?.growth ?? []} />{portal?.growth.length ? <div className="record-card-grid">{portal.growth.map((item) => <section key={item.id}><time>{displayDate(item.measured_at, true)}</time><strong>{item.weight_kg ? `${item.weight_kg} kg` : 'Weight —'}</strong><span>{item.height_cm ? `${item.height_cm} cm` : 'Height —'}{item.bmi ? ` · BMI ${item.bmi}` : ''}</span></section>)}</div> : null}</>}
      {tab === 'documents' && <><div className="tab-actions">{clinicalRole && <label className="button button--primary"><Icon name="plus" /> {uploading ? 'Uploading…' : 'Upload document'}<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} /></label>}</div>{portal?.documents.length ? <div className="data-table">{portal.documents.map((item) => <button className="data-row data-row--button" key={item.id} onClick={() => void openPatientDocument(item)}><span className="data-row__icon"><Icon name="file" /></span><div className="data-row__main"><strong>{item.title}</strong><span>{item.category.replace('_', ' ')} · {(item.size_bytes / 1024).toFixed(0)} KB</span></div><span className="data-row__meta">{displayDate(item.created_at, true)}</span><Icon name="arrow" size={16} /></button>)}</div> : <Empty text="Secure reports and documents will appear here." />}</>}
      {tab === 'billing' && <><div className="tab-actions">{profile && ['owner', 'admin', 'reception', 'staff'].includes(profile.role) && <button className="button button--primary" onClick={() => setAction('invoice')}><Icon name="plus" /> Create invoice</button>}</div>{portal?.invoices.length ? <div className="data-table">{portal.invoices.map((item) => <div className="data-row" key={item.id}><span className="data-row__icon"><Icon name="bill" /></span><div className="data-row__main"><strong>{item.invoice_number}</strong><span>Paid ₹{Number(item.amount_paid).toFixed(2)} of ₹{Number(item.total).toFixed(2)}</span></div><span className="data-row__meta">{displayDate(item.issued_at, true)}</span><span className={`status-badge status-badge--${item.status}`}>{item.status.replace('_', ' ')}</span></div>)}</div> : <Empty text="Invoices and receipts will appear here." />}</>}
    </article>
    {action && patientId && <PatientQuickAction action={action} patientId={patientId} onSaved={() => void load()} onClose={() => setAction(null)} />}
  </section>
}
