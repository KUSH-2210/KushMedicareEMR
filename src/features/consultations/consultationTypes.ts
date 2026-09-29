import type {
  ExaminationFinding,
  DoctorAdviceSnippet,
  DoctorMedicationPreference,
  FoodTiming,
  Medication,
  GeneralCondition,
  FindingStatus,
  Patient,
  Clinic,
  PatientAllergy,
  Profile,
  PrescriptionItem,
  PrescriptionTemplate,
  PrescriptionTemplateAdvice,
  PrescriptionTemplateInvestigation,
  PrescriptionTemplateItem,
  Visit,
  VisitAdvice,
  VisitComplaint,
  VisitDiagnosis,
  VisitInvestigation,
  Vital,
} from '../../lib/database.types'

export type DurationUnit = 'hours' | 'days' | 'weeks' | 'months'
export type FollowUpUnit = 'days' | 'weeks' | 'months'

export interface VitalsFormValues {
  systolicBp: string
  diastolicBp: string
  pulseBpm: string
  temperatureF: string
  oxygenSaturation: string
  weightKg: string
  heightCm: string
  respiratoryRate: string
}

export interface ComplaintDraft {
  id: string
  name: string
  durationValue: string
  durationUnit: DurationUnit
  notes: string
}

export interface ExaminationFormValues {
  generalCondition: GeneralCondition
  pallor: FindingStatus
  icterus: FindingStatus
  cyanosis: FindingStatus
  clubbing: FindingStatus
  edema: FindingStatus
  lymphadenopathy: FindingStatus
  cvs: string
  respiratorySystem: string
  abdomen: string
  cns: string
  localExamination: string
  otherFindings: string
}

export interface DiagnosisDraft {
  id: string
  name: string
  notes: string
  isPrimary: boolean
}

export interface MedicineDraft {
  id: string
  medicationId: string | null
  brandName: string
  genericName: string
  formulation: string
  strength: string
  doseValue: string
  doseUnit: string
  doseText: string
  frequencyCode: string
  frequencyText: string
  foodTiming: FoodTiming
  durationValue: string
  durationUnit: 'days' | 'weeks' | 'months'
  durationText: string
  instructions: string
}

export interface MedicationOption extends Medication {
  preference: DoctorMedicationPreference | null
}

export interface PrescriptionTemplateBundle {
  template: PrescriptionTemplate
  medicines: PrescriptionTemplateItem[]
  investigations: PrescriptionTemplateInvestigation[]
  advice: PrescriptionTemplateAdvice[]
}

export interface FollowUpFormValues {
  type: 'none' | 'interval' | 'date'
  intervalValue: string
  intervalUnit: FollowUpUnit
  date: string
  notes: string
}

export interface ConsultationFormValues {
  vitals: VitalsFormValues
  complaints: ComplaintDraft[]
  examination: ExaminationFormValues
  diagnoses: DiagnosisDraft[]
  medicines: MedicineDraft[]
  investigations: string[]
  advice: string[]
  followUp: FollowUpFormValues
}

export interface ConsultationContext {
  patient: Patient
  allergies: PatientAllergy[]
  previousVisit: Visit | null
  medicationOptions: MedicationOption[]
  previousMedicines: PrescriptionItem[]
  templates: PrescriptionTemplateBundle[]
  adviceSnippets: DoctorAdviceSnippet[]
}

export interface ConsultationHistoryItem {
  visit: Visit
  primaryDiagnosis: VisitDiagnosis | null
  complaints: VisitComplaint[]
  clinician: Profile | null
  medicineCount: number
}

export interface ConsultationDetail {
  visit: Visit
  clinic: Clinic
  patient: Patient
  clinician: Profile | null
  vitals: Vital | null
  complaints: VisitComplaint[]
  examination: ExaminationFinding | null
  diagnoses: VisitDiagnosis[]
  medicines: PrescriptionItem[]
  investigations: VisitInvestigation[]
  advice: VisitAdvice[]
}
