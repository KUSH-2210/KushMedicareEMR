import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Alert } from '../components/Alert'
import { Icon } from '../components/Icon'
import { getConsultationDetail, getConsultationErrorMessage } from '../features/consultations/consultationService'
import type { ConsultationDetail } from '../features/consultations/consultationTypes'
import { PrescriptionDocument } from '../features/prescriptions/components/PrescriptionDocument'
import { buildSavedPrescription, printPrescriptionWhenReady, sanitizePrescriptionFilename, type PrescriptionAssetUrls } from '../features/prescriptions/prescriptionUtils'
import { normalizePrescriptionPaperSize, type PrescriptionPaperSize } from '../features/prescriptions/prescriptionTypes'
import { getPrescriptionAssetUrls } from '../features/settings/settingsService'
import '../features/consultations/consultation.css'

export function ConsultationDetailPage() {
  const { patientId, visitId } = useParams()
  const [searchParams] = useSearchParams()
  const [detail, setDetail] = useState<ConsultationDetail | null>(null)
  const [assets, setAssets] = useState<PrescriptionAssetUrls>({ logoUrl: null, signatureUrl: null })
  const [paperSize, setPaperSize] = useState<PrescriptionPaperSize>('A4')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadedVisitId, setLoadedVisitId] = useState<string | null>(null)
  const autoPrinted = useRef(false)

  useEffect(() => {
    if (!visitId) return
    let active = true
    void getConsultationDetail(visitId)
      .then(async (result) => {
        if (patientId && result.patient.id !== patientId) throw { code: '42501' }
        const urls = await getPrescriptionAssetUrls(result.clinic, result.clinician).catch(() => ({ logoUrl: null, signatureUrl: null }))
        if (!active) return
        setDetail(result)
        setAssets(urls)
        setPaperSize(normalizePrescriptionPaperSize(result.clinic.default_paper_size))
        setError(null)
      })
      .catch((caught: unknown) => { if (active) setError(getConsultationErrorMessage(caught, 'Unable to load this consultation.')) })
      .finally(() => { if (active) setLoadedVisitId(visitId) })
    return () => { active = false }
  }, [patientId, visitId])

  const printSaved = useCallback(async (mode: 'print' | 'pdf') => {
    if (!detail) return
    if (mode === 'pdf') setNotice('In the browser print dialog, choose “Save as PDF”. The PDF remains on this device unless you share it.')
    const filename = sanitizePrescriptionFilename(`${detail.patient.first_name} ${detail.patient.last_name}`, detail.visit.visited_at)
    await printPrescriptionWhenReady(filename, paperSize)
  }, [detail, paperSize])

  useEffect(() => {
    if (!detail || searchParams.get('print') !== '1' || autoPrinted.current) return
    autoPrinted.current = true
    void printSaved('print')
  }, [detail, printSaved, searchParams])

  if (loadedVisitId !== visitId) return <div className="loading-panel"><span className="inline-loader" /> Loading saved prescription…</div>
  if (error || !detail) return <section><Link className="back-link" to={patientId ? `/app/patients/${patientId}` : '/app/patients'}><Icon name="arrow" /> Back to patient</Link><Alert>{error ?? 'Consultation not found.'}</Alert></section>

  const document = buildSavedPrescription(detail, assets)
  return <section className="consultation-detail-page">
    <Link className="back-link" to={`/app/patients/${detail.patient.id}`}><Icon name="arrow" /> Back to patient profile</Link>
    {notice && <div className="print-notice"><Alert tone="success">{notice}</Alert></div>}
    <div className="print-toolbar">
      <div><span className="eyebrow">Saved prescription</span><h1>{detail.visit.prescription_number ?? 'Consultation record'}</h1><p>Printing uses canonical saved clinical data.</p></div>
      <label>Paper<select value={paperSize} onChange={(event) => setPaperSize(event.target.value as PrescriptionPaperSize)}><option value="A4">A4</option><option value="A5">A5</option></select></label>
      <button type="button" className="button button--secondary" onClick={() => void printSaved('pdf')}>Save PDF</button>
      <button type="button" className="button button--primary" onClick={() => void printSaved('print')}>Print</button>
    </div>
    <div className="prescription-print-area"><PrescriptionDocument data={document} paperSize={paperSize} /></div>
  </section>
}
