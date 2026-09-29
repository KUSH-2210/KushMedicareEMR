import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { Icon } from '../components/Icon'
import { useAuth } from '../features/auth/useAuth'
import {
  listAppointments,
  listInvestigations,
  listInvoices,
  listMedicines,
  listPrescriptions,
  listTemplates,
  listVaccinations,
  listVisits,
  saveMedicine,
  updateAppointmentStatus,
  type PortalAppointment,
  type PortalInvestigation,
  type PortalInvoice,
  type PortalVaccination,
  type PortalVisit,
} from '../features/portal/portalService'
import type { Medication, PrescriptionTemplate } from '../lib/database.types'

export type OperationsKind = 'today' | 'consultations' | 'prescriptions' | 'appointments' | 'vaccinations' | 'investigations' | 'billing' | 'templates' | 'medicines' | 'reports'

type Row = PortalAppointment | PortalVisit | PortalVaccination | PortalInvestigation | PortalInvoice | Medication | PrescriptionTemplate

const copy: Record<OperationsKind, { eyebrow: string; title: string; description: string; icon: Parameters<typeof Icon>[0]['name'] }> = {
  today: { eyebrow: 'Live clinic queue', title: 'Today', description: 'Move patients from arrival through consultation without losing context.', icon: 'clock' },
  consultations: { eyebrow: 'Clinical history', title: 'Consultations', description: 'Review recent encounters across the clinic.', icon: 'clipboard' },
  prescriptions: { eyebrow: 'Issued records', title: 'Prescriptions', description: 'Find, open, and print prescriptions from saved consultations.', icon: 'file' },
  appointments: { eyebrow: 'Clinic schedule', title: 'Appointments', description: 'A clear day schedule for the clinical and reception team.', icon: 'calendar' },
  vaccinations: { eyebrow: 'Preventive care', title: 'Vaccinations', description: 'Track due, given, overdue, and skipped doses.', icon: 'syringe' },
  investigations: { eyebrow: 'Orders and results', title: 'Investigations', description: 'Follow investigations from order through review.', icon: 'flask' },
  billing: { eyebrow: 'Clinic accounts', title: 'Billing', description: 'Review invoices, payment state, and outstanding balances.', icon: 'bill' },
  templates: { eyebrow: 'Faster prescribing', title: 'Templates', description: 'Manage reusable prescription sets for common visits.', icon: 'template' },
  medicines: { eyebrow: 'Clinic formulary', title: 'Medicines', description: 'Maintain searchable medicine names, strengths, and manufacturers.', icon: 'medicine' },
  reports: { eyebrow: 'Operational insight', title: 'Reports', description: 'A compact view of clinic activity and follow-up workload.', icon: 'chart' },
}

function person(row: Row) {
  if ('patient' in row && row.patient) return `${row.patient.first_name} ${row.patient.last_name}`
  return 'Patient record'
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function titleFor(row: Row, kind: OperationsKind) {
  if (kind === 'medicines' && 'generic_name' in row) return row.brand_name || row.generic_name || 'Unnamed medicine'
  if (kind === 'templates' && 'name' in row) return row.name
  if (kind === 'vaccinations' && 'vaccine_name' in row) return row.vaccine_name
  if (kind === 'investigations' && 'name' in row) return row.name
  if (kind === 'billing' && 'invoice_number' in row) return row.invoice_number
  if ('prescription_number' in row && row.prescription_number) return row.prescription_number
  if ('reason' in row) return row.reason
  if ('visit_type' in row) return row.visit_type.replace('_', ' ')
  return copy[kind].title
}

function metaFor(row: Row, kind: OperationsKind) {
  if (kind === 'medicines' && 'generic_name' in row) return [row.generic_name, row.strength, row.formulation, row.manufacturer].filter(Boolean).join(' · ') || 'No details'
  if (kind === 'templates' && 'usage_count' in row) return `${row.usage_count ?? 0} uses${row.is_shared ? ' · Shared' : ''}`
  if ('starts_at' in row) return dateTime(row.starts_at)
  if ('visited_at' in row) return dateTime(row.visited_at)
  if ('ordered_at' in row) return dateTime(row.ordered_at)
  if ('issued_at' in row) return `${dateTime(row.issued_at)} · ₹${Number(row.total).toFixed(2)}`
  if ('due_date' in row) return row.due_date ? `Due ${row.due_date}` : 'No due date'
  return ''
}

export function OperationsPage({ kind }: { kind: OperationsKind }) {
  const { clinic, profile } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showMedicineForm, setShowMedicineForm] = useState(false)
  const config = copy[kind]

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = kind === 'today' || kind === 'appointments' ? await listAppointments()
        : kind === 'consultations' || kind === 'reports' ? await listVisits()
          : kind === 'prescriptions' ? await listPrescriptions()
            : kind === 'vaccinations' ? await listVaccinations()
              : kind === 'investigations' ? await listInvestigations()
                : kind === 'billing' ? await listInvoices()
                  : kind === 'medicines' ? await listMedicines()
                    : await listTemplates()
      setRows(data)
    } catch {
      setError('This module could not be loaded. Confirm that the Phase 4 migration is applied, then try again.')
    } finally {
      setLoading(false)
    }
  }, [kind])

  useEffect(() => { queueMicrotask(() => void load()) }, [load])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) => `${titleFor(row, kind)} ${person(row)} ${metaFor(row, kind)}`.toLowerCase().includes(needle))
  }, [kind, query, rows])

  const changeQueueStatus = async (row: PortalAppointment, status: PortalAppointment['status']) => {
    try {
      await updateAppointmentStatus(row.id, status)
      await load()
    } catch { setError('The queue status could not be updated.') }
  }

  const addMedicine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!clinic || !profile) return
    const form = new FormData(event.currentTarget)
    try {
      await saveMedicine({
        clinic_id: clinic.id,
        created_by: profile.id,
        brand_name: String(form.get('brand') || '').trim() || null,
        generic_name: String(form.get('generic') || '').trim() || null,
        strength: String(form.get('strength') || '').trim() || null,
        formulation: String(form.get('formulation') || '').trim() || null,
        manufacturer: String(form.get('manufacturer') || '').trim() || null,
        is_active: true,
      })
      setShowMedicineForm(false)
      await load()
    } catch { setError('The medicine could not be saved. Check that a brand or generic name is provided.') }
  }

  return <section>
    <div className="page-heading page-heading--compact">
      <div><span className="eyebrow">{config.eyebrow}</span><h1>{config.title}</h1><p>{config.description}</p></div>
      {kind === 'medicines' && profile?.role !== 'reception' && profile?.role !== 'staff' && <button className="button button--primary" onClick={() => setShowMedicineForm((value) => !value)}><Icon name="plus" /> Add medicine</button>}
      {(kind === 'today' || kind === 'appointments') && <Link className="button button--primary" to="/app/patients"><Icon name="plus" /> Book from patient</Link>}
    </div>

    {showMedicineForm && <form className="inline-create-card" onSubmit={addMedicine}>
      <label>Brand name<input name="brand" maxLength={160} /></label>
      <label>Generic name<input name="generic" maxLength={160} /></label>
      <label>Strength<input name="strength" maxLength={80} /></label>
      <label>Formulation<input name="formulation" maxLength={80} /></label>
      <label>Manufacturer<input name="manufacturer" maxLength={160} /></label>
      <button className="button button--primary" type="submit">Save medicine</button>
    </form>}

    <div className="module-toolbar">
      <div className="search-box search-box--inline"><Icon name="search" /><input aria-label={`Search ${config.title}`} type="search" placeholder={`Search ${config.title.toLowerCase()}…`} value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <span>{filtered.length} records</span>
    </div>
    {error && <Alert>{error}</Alert>}
    {loading ? <div className="loading-panel"><span className="inline-loader" /> Loading {config.title.toLowerCase()}…</div>
      : filtered.length === 0 ? <div className="empty-panel empty-panel--small"><span className="empty-panel__mark"><Icon name={config.icon} /></span><h2>No records found</h2><p>New clinic activity will appear here.</p></div>
        : <div className="data-table" role="table" aria-label={config.title}>
          {filtered.map((row) => {
            const patientId = 'patient_id' in row ? row.patient_id : null
            const status = 'status' in row ? row.status : 'is_active' in row ? (row.is_active ? 'active' : 'inactive') : null
            const visitId = 'visited_at' in row ? row.id : null
            return <div className="data-row" role="row" key={row.id}>
              <span className="data-row__icon"><Icon name={config.icon} /></span>
              <div className="data-row__main"><strong>{titleFor(row, kind)}</strong><span>{person(row)}</span></div>
              <span className="data-row__meta">{metaFor(row, kind)}</span>
              {status && <span className={`status-badge status-badge--${status}`}>{String(status).replace('_', ' ')}</span>}
              {kind === 'today' && 'starts_at' in row && row.status !== 'completed' && row.status !== 'cancelled' ? <div className="row-actions">
                {row.status === 'scheduled' && <button onClick={() => void changeQueueStatus(row, 'checked_in')}>Check in</button>}
                {row.status === 'checked_in' && <button onClick={() => void changeQueueStatus(row, 'in_consultation')}>Start</button>}
                {row.status === 'in_consultation' && <button onClick={() => void changeQueueStatus(row, 'completed')}>Complete</button>}
              </div> : patientId && <Link className="row-link" to={visitId ? `/app/patients/${patientId}/consultations/${visitId}` : `/app/patients/${patientId}`}>Open <Icon name="arrow" size={16} /></Link>}
            </div>
          })}
        </div>}
  </section>
}
