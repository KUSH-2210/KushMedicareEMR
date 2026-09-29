import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { Icon } from '../components/Icon'
import { useAuth } from '../features/auth/useAuth'
import { createPatient, getPatientDataErrorMessage } from '../features/patients/patientService'
import {
  emptyPatientForm,
  validatePatient,
  type PatientFormErrors,
  type PatientFormValues,
} from '../features/patients/patientValidation'

function FieldError({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null
}

export function NewPatientPage() {
  const { profile, user } = useAuth()
  const [values, setValues] = useState<PatientFormValues>(emptyPatientForm)
  const [errors, setErrors] = useState<PatientFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const update = (field: keyof PatientFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validatePatient(values)
    setErrors(nextErrors)
    setSubmitError(null)
    if (Object.keys(nextErrors).length || !profile || !user) return

    setSubmitting(true)
    try {
      const patient = await createPatient(profile.clinic_id, user.id, values)
      navigate(`/app/patients/${patient.id}`, { replace: true, state: { created: true } })
    } catch (error) {
      setSubmitError(getPatientDataErrorMessage(error, 'Could not create the patient record. Please try again.'))
      setSubmitting(false)
    }
  }

  return (
    <section className="form-page">
      <Link className="back-link" to="/app/patients"><Icon name="arrow" /> Back to patients</Link>
      <div className="page-heading page-heading--compact">
        <div><span className="eyebrow">Patient registration</span><h1>New patient</h1><p>Create a demographic record. Clinical visits can be added afterward.</p></div>
      </div>

      <form className="record-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        {submitError && <Alert>{submitError}</Alert>}
        <fieldset>
          <legend><span>01</span> Core details</legend>
          <div className="form-grid">
            <label><span>Medical record number *</span><input value={values.medicalRecordNumber} onChange={(event) => update('medicalRecordNumber', event.target.value)} aria-invalid={Boolean(errors.medicalRecordNumber)} placeholder="e.g. CL-0001" /><FieldError message={errors.medicalRecordNumber} /></label>
            <label><span>Date of birth *</span><input type="date" value={values.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} aria-invalid={Boolean(errors.dateOfBirth)} /><FieldError message={errors.dateOfBirth} /></label>
            <label><span>First name *</span><input autoComplete="given-name" value={values.firstName} onChange={(event) => update('firstName', event.target.value)} aria-invalid={Boolean(errors.firstName)} /><FieldError message={errors.firstName} /></label>
            <label><span>Last name *</span><input autoComplete="family-name" value={values.lastName} onChange={(event) => update('lastName', event.target.value)} aria-invalid={Boolean(errors.lastName)} /><FieldError message={errors.lastName} /></label>
            <label><span>Sex *</span><select value={values.sex} onChange={(event) => update('sex', event.target.value)} aria-invalid={Boolean(errors.sex)}><option value="">Select…</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="unknown">Unknown</option></select><FieldError message={errors.sex} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend><span>02</span> Contact information</legend>
          <div className="form-grid">
            <label><span>Phone</span><input type="tel" autoComplete="tel" value={values.phone} onChange={(event) => update('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} /><FieldError message={errors.phone} /></label>
            <label><span>Email</span><input type="email" autoComplete="email" value={values.email} onChange={(event) => update('email', event.target.value)} aria-invalid={Boolean(errors.email)} /><FieldError message={errors.email} /></label>
            <label className="form-grid__wide"><span>Address</span><textarea rows={3} autoComplete="street-address" value={values.address} onChange={(event) => update('address', event.target.value)} aria-invalid={Boolean(errors.address)} /><FieldError message={errors.address} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend><span>03</span> Emergency contact</legend>
          <div className="form-grid">
            <label><span>Contact name</span><input value={values.emergencyContactName} onChange={(event) => update('emergencyContactName', event.target.value)} /></label>
            <label><span>Contact phone</span><input type="tel" value={values.emergencyContactPhone} onChange={(event) => update('emergencyContactPhone', event.target.value)} aria-invalid={Boolean(errors.emergencyContactPhone)} /><FieldError message={errors.emergencyContactPhone} /></label>
          </div>
        </fieldset>

        <div className="form-actions">
          <Link className="button button--secondary" to="/app/patients">Cancel</Link>
          <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Creating record…' : 'Create patient'}</button>
        </div>
      </form>
    </section>
  )
}
