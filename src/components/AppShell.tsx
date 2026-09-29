import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../lib/errors'
import { Alert } from './Alert'
import { Icon } from './Icon'
import { useAuth } from '../features/auth/useAuth'
import { searchPatients, type Patient } from '../features/patients/patientService'

const navigation = [
  { to: '/app', label: 'Dashboard', icon: 'home' as const, end: true, group: 'Workspace' },
  { to: '/app/today', label: 'Today', icon: 'clock' as const, group: 'Workspace' },
  { to: '/app/patients', label: 'Patients', icon: 'patients' as const, group: 'Workspace' },
  { to: '/app/appointments', label: 'Appointments', icon: 'calendar' as const, group: 'Workspace' },
  { to: '/app/consultations', label: 'Consultations', icon: 'clipboard' as const, group: 'Clinical care' },
  { to: '/app/prescriptions', label: 'Prescriptions', icon: 'file' as const, group: 'Clinical care' },
  { to: '/app/vaccinations', label: 'Vaccinations', icon: 'syringe' as const, group: 'Clinical care' },
  { to: '/app/investigations', label: 'Investigations', icon: 'flask' as const, group: 'Clinical care' },
  { to: '/app/billing', label: 'Billing', icon: 'bill' as const, group: 'Clinic tools' },
  { to: '/app/templates', label: 'Templates', icon: 'template' as const, group: 'Clinic tools' },
  { to: '/app/medicines', label: 'Medicines', icon: 'medicine' as const, group: 'Clinic tools' },
  { to: '/app/reports', label: 'Reports', icon: 'chart' as const, group: 'Clinic tools' },
  { to: '/app/settings', label: 'Settings', icon: 'settings' as const, group: 'Clinic tools' },
]

export function AppShell() {
  const { clinic, profile, signOut } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Patient[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
      if (event.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!paletteOpen || !profile) return
    let active = true
    const timer = window.setTimeout(() => {
      void searchPatients(profile.clinic_id, query).then((data) => { if (active) setResults(data.slice(0, 7)) }).catch(() => { if (active) setResults([]) })
    }, query ? 220 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [paletteOpen, profile, query])

  const handleSignOut = async () => {
    setSignOutError(null)
    try { await signOut(); navigate('/login', { replace: true }) }
    catch (error) { setSignOutError(getErrorMessage(error, 'Could not sign out. Please try again.')) }
  }

  const openPatient = (id: string) => {
    setPaletteOpen(false)
    setQuery('')
    navigate(`/app/patients/${id}`)
  }

  const visibleNavigation = navigation.filter((item) => {
    if (!profile || ['owner', 'admin', 'doctor'].includes(profile.role)) return true
    return !['/app/consultations', '/app/prescriptions', '/app/vaccinations', '/app/investigations', '/app/templates', '/app/medicines', '/app/reports', '/app/settings'].includes(item.to)
  })

  const navigationGroups = [...new Set(visibleNavigation.map((item) => item.group))]

  return <div className="app-shell">
    <aside className={navOpen ? 'sidebar sidebar--open' : 'sidebar'}>
      <div className="brand"><span className="brand__mark" aria-hidden="true"><i>K</i><b>+</b></span><div><strong>Kush<span>Medicare</span></strong><small>ClinicOS</small></div></div>
      <div className="clinic-status"><span aria-hidden="true" /><div><strong>Clinic workspace</strong><small>Secure &amp; connected</small></div></div>
      <nav className="primary-nav" aria-label="Main navigation">
        {navigationGroups.map((group) => <div className="nav-group" key={group}>
          <span className="nav-group__label">{group}</span>
          {visibleNavigation.filter((item) => item.group === group).map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setNavOpen(false)}><span className="nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span><i aria-hidden="true" /></NavLink>)}
        </div>)}
      </nav>
      <div className="sidebar__footer">
        <span className="avatar" aria-hidden="true">{profile?.full_name.slice(0, 1).toUpperCase()}</span>
        <div><strong>{profile?.full_name}</strong><span>{profile?.role}</span></div>
        <button className="icon-button" type="button" aria-label="Sign out" onClick={() => void handleSignOut()}><Icon name="logout" /></button>
      </div>
    </aside>
    {navOpen && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    <div className="app-main">
      <header className="topbar">
        <button className="icon-button menu-button" type="button" aria-label="Open navigation" onClick={() => setNavOpen(true)}><Icon name="menu" /></button>
        <div className="topbar__clinic"><span className="topbar__label">Now managing</span><strong>{clinic?.name}</strong></div>
        <button className="global-search" type="button" onClick={() => setPaletteOpen(true)}><Icon name="search" /><span>Search patients or actions</span><kbd>Ctrl K</kbd></button>
        <Link className="topbar-action" to="/app/patients/new"><Icon name="plus" /> New patient</Link>
        <time className="topbar-date"><span>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date())}</span>{new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(new Date())}</time>
      </header>
      {signOutError && <div className="shell-alert"><Alert>{signOutError}</Alert></div>}
      <div className="page-container"><Outlet /></div>
    </div>
    {paletteOpen && <div className="command-backdrop" role="presentation" onMouseDown={() => setPaletteOpen(false)}>
      <section className="command-palette" role="dialog" aria-modal="true" aria-label="Global search" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input"><Icon name="search" /><input autoFocus aria-label="Search patients and actions" placeholder="Type a patient name, MRN, phone, or action…" value={query} onChange={(event) => setQuery(event.target.value)} /><button onClick={() => setPaletteOpen(false)}>Esc</button></div>
        <div className="command-section"><span>Quick actions</span><div className="command-actions"><Link to="/app/patients/new" onClick={() => setPaletteOpen(false)}><Icon name="plus" /> Register patient</Link><Link to="/app/today" onClick={() => setPaletteOpen(false)}><Icon name="clock" /> Open today’s queue</Link><Link to="/app/appointments" onClick={() => setPaletteOpen(false)}><Icon name="calendar" /> View appointments</Link></div></div>
        <div className="command-section"><span>Patients</span>{results.length === 0 ? <p className="command-empty">No matching patient records.</p> : results.map((patient) => <button className="command-result" key={patient.id} onClick={() => openPatient(patient.id)}><span className="patient-avatar">{patient.first_name[0]}{patient.last_name[0]}</span><div><strong>{patient.first_name} {patient.last_name}</strong><small>MRN {patient.medical_record_number}{patient.phone ? ` · ${patient.phone}` : ''}</small></div><Icon name="arrow" /></button>)}</div>
      </section>
    </div>}
  </div>
}
