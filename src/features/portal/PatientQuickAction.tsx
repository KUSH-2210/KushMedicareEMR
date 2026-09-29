import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/Alert'
import { useAuth } from '../auth/useAuth'
import { addGrowthMeasurement, addInvestigation, addVaccination, createAppointment, createInvoice } from './portalService'

export type PatientAction = 'appointment' | 'vaccination' | 'investigation' | 'growth' | 'invoice'

export function PatientQuickAction({ action, patientId, onSaved, onClose }: { action: PatientAction; patientId: string; onSaved: () => void; onClose: () => void }) {
  const { clinic, profile } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!clinic || !profile) return
    const values = new FormData(event.currentTarget)
    setSaving(true); setError(null)
    try {
      if (action === 'appointment') await createAppointment({
        clinic_id: clinic.id, patient_id: patientId, clinician_id: null, created_by: profile.id,
        starts_at: new Date(String(values.get('startsAt'))).toISOString(),
        visit_type: String(values.get('visitType')) as 'consultation', notes: String(values.get('notes') || '').trim() || null,
      })
      if (action === 'vaccination') await addVaccination({
        clinic_id: clinic.id, patient_id: patientId, created_by: profile.id,
        vaccine_name: String(values.get('name')), dose_label: String(values.get('dose') || '').trim() || null,
        due_date: String(values.get('date') || '') || null, status: String(values.get('status')) as 'due' | 'given',
        administered_at: values.get('status') === 'given' ? new Date().toISOString() : null,
        administered_by: values.get('status') === 'given' ? profile.id : null,
      })
      if (action === 'investigation') await addInvestigation({
        clinic_id: clinic.id, patient_id: patientId, created_by: profile.id,
        name: String(values.get('name')), status: 'ordered', result_summary: String(values.get('notes') || '').trim() || null,
      })
      if (action === 'growth') await addGrowthMeasurement({
        clinic_id: clinic.id, patient_id: patientId, recorded_by: profile.id,
        measured_at: new Date(String(values.get('measuredAt'))).toISOString(),
        weight_kg: Number(values.get('weight')) || null, height_cm: Number(values.get('height')) || null,
        head_circumference_cm: Number(values.get('head')) || null, notes: String(values.get('notes') || '').trim() || null,
      })
      if (action === 'invoice') {
        const subtotal = Number(values.get('amount'))
        await createInvoice({
          clinic_id: clinic.id, patient_id: patientId, created_by: profile.id,
          invoice_number: `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
          status: 'unpaid', subtotal, discount: Number(values.get('discount')) || 0, amount_paid: 0,
          notes: String(values.get('notes') || '').trim() || null,
        })
      }
      onSaved()
      onClose()
    } catch { setError('The record could not be saved. Review the fields and your role permissions.') }
    finally { setSaving(false) }
  }

  const title = { appointment: 'Book appointment', vaccination: 'Record vaccination', investigation: 'Order investigation', growth: 'Add growth measurement', invoice: 'Create invoice' }[action]
  return <div className="action-drawer" role="dialog" aria-modal="true" aria-label={title}>
    <button className="action-drawer__backdrop" aria-label="Close" onClick={onClose} />
    <form className="action-drawer__panel" onSubmit={submit}>
      <header><div><span className="eyebrow">Patient action</span><h2>{title}</h2></div><button type="button" className="icon-button" onClick={onClose}>×</button></header>
      {error && <Alert>{error}</Alert>}
      {action === 'appointment' && <><label>Date and time<input name="startsAt" type="datetime-local" required /></label><label>Visit type<select name="visitType"><option value="consultation">Consultation</option><option value="follow_up">Follow-up</option><option value="vaccination">Vaccination</option><option value="procedure">Procedure</option><option value="other">Other</option></select></label></>}
      {action === 'vaccination' && <><label>Vaccine name<input name="name" required maxLength={160} /></label><label>Dose<input name="dose" maxLength={80} placeholder="Dose 1" /></label><label>Status<select name="status"><option value="given">Given now</option><option value="due">Due</option></select></label><label>Due date<input name="date" type="date" /></label></>}
      {action === 'investigation' && <label>Investigation<input name="name" required maxLength={200} placeholder="Complete blood count" /></label>}
      {action === 'growth' && <><label>Measured at<input name="measuredAt" type="datetime-local" required /></label><div className="settings-pair"><label>Weight (kg)<input name="weight" type="number" min="0.1" max="500" step="0.01" /></label><label>Height (cm)<input name="height" type="number" min="10" max="250" step="0.01" /></label></div><label>Head circumference (cm)<input name="head" type="number" min="10" max="100" step="0.01" /></label></>}
      {action === 'invoice' && <div className="settings-pair"><label>Amount (₹)<input name="amount" type="number" min="0" step="0.01" required /></label><label>Discount (₹)<input name="discount" type="number" min="0" step="0.01" defaultValue="0" /></label></div>}
      {action !== 'vaccination' && <label>Notes<textarea name="notes" rows={3} maxLength={2000} /></label>}
      <footer><button type="button" className="button button--secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button--primary" disabled={saving}>{saving ? 'Saving…' : 'Save record'}</button></footer>
    </form>
  </div>
}
