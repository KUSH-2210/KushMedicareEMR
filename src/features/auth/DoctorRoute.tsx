import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'

export function DoctorRoute() {
  const { profile } = useAuth()
  return profile && ['owner', 'admin', 'doctor'].includes(profile.role) ? <Outlet /> : <Navigate to="/app/patients" replace />
}
