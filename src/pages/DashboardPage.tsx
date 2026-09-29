import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { Icon } from '../components/Icon'
import { useAuth } from '../features/auth/useAuth'
import { getDashboardData } from '../features/portal/portalService'

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>

function displayTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function patientName(patient?: { first_name: string; last_name: string }) {
  return patient ? `${patient.first_name} ${patient.last_name}` : 'Patient record'
}

export function DashboardPage() {
  const { profile } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const firstName = profile?.full_name.split(' ')[0] ?? 'there'

  useEffect(() => {
    if (!profile) return
    let active = true
    void getDashboardData(profile.clinic_id)
      .then((result) => { if (active) { setData(result); setError(null) } })
      .catch(() => { if (active) setError('Dashboard activity could not be loaded. Confirm that the Phase 4 migration is applied.') })
    return () => { active = false }
  }, [profile])

  return <section className="dashboard-page">
    <div className="page-heading page-heading--compact page-heading--dashboard">
      <div><span className="eyebrow">Clinic command center</span><h1>Good day, {firstName}<span className="heading-spark">✦</span></h1><p>{new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p></div>
      <div className="dashboard-heading-side"><span className="system-pill"><i aria-hidden="true" /> Systems operational</span><div className="heading-actions"><Link className="button button--secondary" to="/app/today"><Icon name="clock" /> Open queue</Link><Link className="button button--primary" to="/app/patients/new"><Icon name="plus" /> New patient</Link></div></div>
    </div>
    {error && <Alert>{error}</Alert>}
    <div className="metric-grid">
      <Link to="/app/today" className="metric-card metric-card--blue"><span className="metric-card__icon"><Icon name="calendar" /></span><span>Today’s appointments</span><strong>{data?.appointments.length ?? '—'}</strong><small>Scheduled and in progress <Icon name="arrow" size={14} /></small></Link>
      <Link to="/app/consultations" className="metric-card metric-card--violet"><span className="metric-card__icon"><Icon name="clipboard" /></span><span>Consultations today</span><strong>{data?.consultations.length ?? '—'}</strong><small>Saved clinical encounters <Icon name="arrow" size={14} /></small></Link>
      <Link to="/app/patients" className="metric-card metric-card--cyan"><span className="metric-card__icon"><Icon name="patients" /></span><span>Recent patients</span><strong>{data?.recentPatients.length ?? '—'}</strong><small>Updated records <Icon name="arrow" size={14} /></small></Link>
      <Link to="/app/reports" className="metric-card metric-card--accent"><span className="metric-card__icon"><Icon name="chart" /></span><span>Follow-ups due</span><strong>{data?.followUps.length ?? '—'}</strong><small>Next seven days <Icon name="arrow" size={14} /></small></Link>
    </div>
    <div className="dashboard-columns">
      <article className="detail-card">
        <div className="card-heading"><div><h2>Today’s queue</h2><span>Live appointment status</span></div><Link to="/app/today">View all</Link></div>
        {!data ? <div className="loading-panel"><span className="inline-loader" /> Loading activity…</div> : data.appointments.length === 0 ? <div className="card-empty card-empty--compact"><Icon name="calendar" /><strong>No appointments today</strong><p>The queue is ready for walk-ins.</p></div> : data.appointments.slice(0, 6).map((item) => <Link className="activity-row" key={item.id} to={`/app/patients/${item.patient_id}`}><span className="activity-time">{displayTime(item.starts_at)}</span><div><strong>{patientName(item.patient)}</strong><span>{item.visit_type.replace('_', ' ')}</span></div><span className={`status-badge status-badge--${item.status}`}>{item.status.replace('_', ' ')}</span></Link>)}
      </article>
      <article className="detail-card">
        <div className="card-heading"><div><h2>Follow-ups</h2><span>Coming up this week</span></div><Link to="/app/reports">Review</Link></div>
        {!data ? <div className="loading-panel"><span className="inline-loader" /> Loading follow-ups…</div> : data.followUps.length === 0 ? <div className="card-empty card-empty--compact"><Icon name="clock" /><strong>No follow-ups due</strong><p>Future follow-ups will appear here.</p></div> : data.followUps.slice(0, 6).map((item) => <Link className="activity-row" key={item.id} to={`/app/patients/${item.patient_id}`}><span className="activity-date">{item.follow_up_date ? new Date(`${item.follow_up_date}T00:00:00`).getDate() : '—'}</span><div><strong>{patientName(item.patient)}</strong><span>{item.reason}</span></div><Icon name="arrow" size={17} /></Link>)}
      </article>
    </div>
    <article className="detail-card recent-card">
      <div className="card-heading"><div><h2>Recently updated patients</h2><span>Continue where the clinic left off</span></div><Link to="/app/patients">Patient directory</Link></div>
      <div className="recent-patient-grid">{data?.recentPatients.map((patient) => <Link key={patient.id} to={`/app/patients/${patient.id}`}><span className="patient-avatar">{patient.first_name[0]}{patient.last_name[0]}</span><div><strong>{patient.first_name} {patient.last_name}</strong><span>MRN {patient.medical_record_number}</span></div><Icon name="arrow" size={17} /></Link>)}</div>
    </article>
  </section>
}
