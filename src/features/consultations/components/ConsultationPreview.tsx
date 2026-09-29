import type { Clinic, Profile } from '../../../lib/database.types'
import { PrescriptionDocument } from '../../prescriptions/components/PrescriptionDocument'
import { buildDraftPrescription, type PrescriptionAssetUrls } from '../../prescriptions/prescriptionUtils'
import type { ConsultationContext, ConsultationFormValues } from '../consultationTypes'

export function ConsultationPreview({ context, values, clinic, profile, assets = { logoUrl: null, signatureUrl: null }, onBackToMedicines }: {
  context: ConsultationContext
  values: ConsultationFormValues
  clinic: Clinic | null
  profile: Profile | null
  assets?: PrescriptionAssetUrls
  onBackToMedicines: () => void
}) {
  const document = buildDraftPrescription(context, values, clinic, profile, assets)
  return <section className="workspace-panel preview-panel" aria-labelledby="tab-preview">
    <div className="preview-toolbar"><button type="button" className="button button--secondary" onClick={onBackToMedicines}>← Back to Medicines</button><span><strong>Unsaved draft.</strong> Save before printing.</span></div>
    <div className="prescription-print-area"><PrescriptionDocument data={document} /></div>
  </section>
}
