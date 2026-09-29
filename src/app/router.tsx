/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { RouteErrorPage } from '../components/RouteErrorPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { DoctorRoute } from '../features/auth/DoctorRoute'

const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ConsultationDetailPage = lazy(() => import('../pages/ConsultationDetailPage').then((module) => ({ default: module.ConsultationDetailPage })))
const ConsultationPage = lazy(() => import('../pages/ConsultationPage').then((module) => ({ default: module.ConsultationPage })))
const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const NewPatientPage = lazy(() => import('../pages/NewPatientPage').then((module) => ({ default: module.NewPatientPage })))
const PatientProfilePage = lazy(() => import('../pages/PatientProfilePage').then((module) => ({ default: module.PatientProfilePage })))
const PatientsPage = lazy(() => import('../pages/PatientsPage').then((module) => ({ default: module.PatientsPage })))
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const OperationsPage = lazy(() => import('../pages/OperationsPage').then((module) => ({ default: module.OperationsPage })))

function page(element: ReactNode) {
  return <Suspense fallback={<div className="loading-panel"><span className="inline-loader" /> Loading workspace…</div>}>{element}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/login', element: page(<LoginPage />), errorElement: <RouteErrorPage /> },
  { element: <ProtectedRoute />, errorElement: <RouteErrorPage />, children: [{ path: '/app', element: <AppShell />, children: [
    { index: true, element: page(<DashboardPage />) },
    { path: 'patients', element: page(<PatientsPage />) },
    { path: 'patients/new', element: page(<NewPatientPage />) },
    { path: 'today', element: page(<OperationsPage kind="today" />) },
    { path: 'appointments', element: page(<OperationsPage kind="appointments" />) },
    { path: 'billing', element: page(<OperationsPage kind="billing" />) },
    { element: <DoctorRoute />, children: [
      { path: 'consultations', element: page(<OperationsPage kind="consultations" />) },
      { path: 'prescriptions', element: page(<OperationsPage kind="prescriptions" />) },
      { path: 'vaccinations', element: page(<OperationsPage kind="vaccinations" />) },
      { path: 'investigations', element: page(<OperationsPage kind="investigations" />) },
      { path: 'templates', element: page(<OperationsPage kind="templates" />) },
      { path: 'medicines', element: page(<OperationsPage kind="medicines" />) },
      { path: 'reports', element: page(<OperationsPage kind="reports" />) },
      { path: 'patients/:patientId/consultations/new', element: page(<ConsultationPage />) },
      { path: 'patients/:patientId/consultations/:visitId', element: page(<ConsultationDetailPage />) },
      { path: 'settings', element: page(<SettingsPage />) },
    ] },
    { path: 'patients/:patientId', element: page(<PatientProfilePage />) },
  ] }] },
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '*', element: <Navigate to="/app" replace /> },
])
