import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullPageStatus } from '../../components/FullPageStatus'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const { configured, session, profile, loading, error, signOut } = useAuth()
  const location = useLocation()

  if (!configured) {
    return (
      <FullPageStatus
        title="Connect Supabase to continue"
        message="Copy .env.example to .env.local and add your project URL and publishable key. Service-role keys must never be used here."
      />
    )
  }

  if (loading) {
    return <FullPageStatus title="Opening clinic" message="Checking your secure session…" busy />
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (error || !profile) {
    return (
      <FullPageStatus
        title="Clinic access unavailable"
        message={error ?? 'No clinic profile was found.'}
        action={<button className="button button--secondary" type="button" onClick={() => void signOut()}>Sign out</button>}
      />
    )
  }

  return <Outlet />
}
