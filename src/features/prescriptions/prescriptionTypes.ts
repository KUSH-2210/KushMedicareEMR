export type PrescriptionPaperSize = 'A4' | 'A5'

export function normalizePrescriptionPaperSize(value: unknown): PrescriptionPaperSize {
  return value === 'A5' ? 'A5' : 'A4'
}

export interface PrescriptionLineItem {
  primary: string
  secondary?: string
  detail?: string
  note?: string
}

export interface PrescriptionDocumentData {
  state: 'draft' | 'saved'
  paperSize: PrescriptionPaperSize
  prescriptionNumber: string | null
  date: string
  clinic: { name: string; address: string | null; phone: string | null; email: string | null; footer: string | null; logoUrl: string | null }
  doctor: { name: string; qualification: string | null; specialization: string | null; registrationNumber: string | null; additionalCredentials: string | null; signatureUrl: string | null }
  patient: { name: string; age: number; sex: string; patientId: string; phone: string | null }
  vitals: string[]
  symptoms: PrescriptionLineItem[]
  examination: string[]
  diagnoses: PrescriptionLineItem[]
  medicines: PrescriptionLineItem[]
  investigations: string[]
  advice: string[]
  followUp: string
}
