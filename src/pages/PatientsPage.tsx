import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { Icon } from '../components/Icon'
import { useAuth } from '../features/auth/useAuth'
import { getPatientDataErrorMessage, searchPatients, type Patient } from '../features/patients/patientService'

function formatBirthDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T00:00:00`),
  )
}

export function PatientsPage() {
  const { profile } = useAuth()
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError(null)
      void searchPatients(profile.clinic_id, query)
        .then((data) => {
          if (active) setPatients(data)
        })
        .catch((caughtError: unknown) => {
          if (active) setError(getPatientDataErrorMessage(caughtError, 'Unable to load patients. Please try again.'))
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, query ? 300 : 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [profile, query])

  return (
    <section>
      <div className="page-heading page-heading--compact">
        <div><span className="eyebrow">Patient directory</span><h1>Patients</h1><p>Search records within your clinic.</p></div>
        <Link className="button button--primary" to="/app/patients/new"><Icon name="plus" /> New patient</Link>
      </div>

      <div className="search-box">
        <Icon name="search" />
        <input
          type="search"
          aria-label="Search patients"
          placeholder="Search name, record number, or phone…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {loading && <span className="inline-loader" aria-label="Searching" />}
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="patient-list" aria-live="polite">
        {!loading && patients.length === 0 ? (
          <div className="empty-panel empty-panel--small">
            <span className="empty-panel__mark"><Icon name="search" /></span>
            <h2>{query ? 'No matching patients' : 'No patients yet'}</h2>
            <p>{query ? 'Try a different name or record number.' : 'Register the first patient for this clinic.'}</p>
          </div>
        ) : patients.map((patient) => (
          <Link className="patient-row" to={`/app/patients/${patient.id}`} key={patient.id}>
            <span className="patient-avatar">{patient.first_name[0]}{patient.last_name[0]}</span>
            <div className="patient-row__identity">
              <strong>{patient.first_name} {patient.last_name}</strong>
              <span>MRN {patient.medical_record_number}</span>
            </div>
            <div className="patient-row__detail"><span>Date of birth</span><strong>{formatBirthDate(patient.date_of_birth)}</strong></div>
            <div className="patient-row__detail"><span>Phone</span><strong>{patient.phone ?? 'Not provided'}</strong></div>
            <Icon name="arrow" />
          </Link>
        ))}
      </div>
    </section>
  )
}
