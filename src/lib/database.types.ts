export type StaffRole = 'owner' | 'admin' | 'doctor' | 'reception' | 'staff'
export type FindingStatus = 'absent' | 'present' | 'not_assessed'
export type GeneralCondition = 'well' | 'fair' | 'ill' | 'critical' | 'not_assessed'
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Clinic = {
  id: string
  name: string
  phone: string | null
  address: string | null
  prescription_name: string | null
  prescription_email: string | null
  logo_path: string | null
  default_paper_size: 'A4' | 'A5'
  prescription_footer: string | null
  created_at: string
  updated_at: string
}

export type Profile = {
  id: string
  clinic_id: string
  full_name: string
  role: StaffRole
  display_name: string | null
  qualification: string | null
  specialization: string | null
  medical_registration_number: string | null
  additional_credentials: string | null
  signature_path: string | null
  created_at: string
  updated_at: string
}

export type Patient = {
  id: string
  clinic_id: string
  medical_record_number: string
  first_name: string
  last_name: string
  date_of_birth: string
  sex: 'female' | 'male' | 'other' | 'unknown'
  phone: string | null
  email: string | null
  address: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null
  chronic_conditions?: string[]
  high_risk_notes?: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type Visit = {
  id: string
  clinic_id: string
  patient_id: string
  clinician_id: string
  visited_at: string
  reason: string
  clinical_notes: string | null
  follow_up_type: 'none' | 'interval' | 'date'
  follow_up_interval_value: number | null
  follow_up_interval_unit: 'days' | 'weeks' | 'months' | null
  follow_up_date: string | null
  follow_up_notes: string | null
  prescription_number: string | null
  created_at: string
  updated_at: string
}

export type PatientAllergy = {
  id: string
  clinic_id: string
  patient_id: string
  allergen: string
  reaction: string | null
  severity: 'mild' | 'moderate' | 'severe' | 'unknown'
  is_active: boolean
  recorded_by: string
  created_at: string
}

export type VisitComplaint = {
  id: string
  clinic_id: string
  visit_id: string
  symptom: string
  duration_value: number | null
  duration_unit: 'hours' | 'days' | 'weeks' | 'months' | null
  notes: string | null
  sort_order: number
  created_at: string
}

export type ExaminationFinding = {
  id: string
  clinic_id: string
  visit_id: string
  general_condition: GeneralCondition
  pallor: FindingStatus
  icterus: FindingStatus
  cyanosis: FindingStatus
  clubbing: FindingStatus
  edema: FindingStatus
  lymphadenopathy: FindingStatus
  cvs: string | null
  respiratory_system: string | null
  abdomen: string | null
  cns: string | null
  local_examination: string | null
  other_findings: string | null
  created_at: string
}

export type VisitDiagnosis = {
  id: string
  clinic_id: string
  visit_id: string
  diagnosis: string
  notes: string | null
  is_primary: boolean
  sort_order: number
  created_at: string
}

export type VisitInvestigation = {
  id: string
  clinic_id: string
  visit_id: string
  investigation: string
  sort_order: number
  created_at: string
}

export type VisitAdvice = {
  id: string
  clinic_id: string
  visit_id: string
  advice: string
  sort_order: number
  created_at: string
}

export type Vital = {
  id: string
  clinic_id: string
  visit_id: string
  recorded_by: string
  recorded_at: string
  systolic_bp: number | null
  diastolic_bp: number | null
  pulse_bpm: number | null
  temperature_c: number | null
  respiratory_rate: number | null
  oxygen_saturation: number | null
  weight_kg: number | null
  height_cm: number | null
}

export type Medication = {
  id: string
  clinic_id: string
  brand_name: string | null
  generic_name: string | null
  formulation: string | null
  strength: string | null
  manufacturer?: string | null
  is_active?: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type FoodTiming = 'before_food' | 'after_food' | 'with_food' | 'no_preference'

export type PrescriptionItem = {
  id: string
  clinic_id: string
  visit_id: string
  medication_id: string | null
  prescribed_by: string
  brand_name: string | null
  generic_name: string | null
  formulation: string | null
  strength: string | null
  dose_value: number | null
  dose_unit: string | null
  dose_text: string | null
  frequency_code: string | null
  frequency_text: string | null
  food_timing: FoodTiming
  duration_value: number | null
  duration_unit: 'days' | 'weeks' | 'months' | null
  duration_text: string | null
  instructions: string | null
  sort_order: number
  created_at: string
}

export type DoctorMedicationPreference = {
  clinic_id: string
  doctor_id: string
  medication_id: string
  usage_count: number
  last_used_at: string | null
  is_favorite: boolean
  updated_at: string
}

export type PrescriptionTemplate = {
  id: string
  clinic_id: string
  doctor_id: string
  name: string
  is_shared?: boolean
  usage_count?: number
  last_used_at?: string | null
  created_at: string
  updated_at: string
}

export type Appointment = {
  id: string
  clinic_id: string
  patient_id: string
  clinician_id: string | null
  starts_at: string
  duration_minutes: number
  visit_type: 'consultation' | 'follow_up' | 'vaccination' | 'procedure' | 'other'
  status: 'scheduled' | 'checked_in' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show'
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type PatientVaccination = {
  id: string
  clinic_id: string
  patient_id: string
  vaccine_name: string
  dose_label: string | null
  status: 'due' | 'given' | 'overdue' | 'skipped'
  due_date: string | null
  administered_at: string | null
  batch_number: string | null
  administered_by: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type PatientInvestigation = {
  id: string
  clinic_id: string
  patient_id: string
  visit_id: string | null
  name: string
  status: 'ordered' | 'sample_collected' | 'result_received' | 'reviewed' | 'cancelled'
  ordered_at: string
  result_summary: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type PatientDocument = {
  id: string
  clinic_id: string
  patient_id: string
  investigation_id: string | null
  category: 'lab_report' | 'imaging' | 'referral' | 'consent' | 'prescription' | 'other'
  title: string
  storage_path: string
  content_type: string
  size_bytes: number
  uploaded_by: string
  created_at: string
}

export type GrowthMeasurement = {
  id: string
  clinic_id: string
  patient_id: string
  visit_id: string | null
  measured_at: string
  weight_kg: number | null
  height_cm: number | null
  head_circumference_cm: number | null
  bmi: number | null
  notes: string | null
  recorded_by: string
  created_at: string
}

export type Invoice = {
  id: string
  clinic_id: string
  patient_id: string
  invoice_number: string
  issued_at: string
  status: 'draft' | 'unpaid' | 'part_paid' | 'paid' | 'void'
  payment_method: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other' | null
  subtotal: number
  discount: number
  total: number
  amount_paid: number
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type InvoiceItem = {
  id: string
  clinic_id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

export type AuditEvent = {
  id: number
  clinic_id: string
  actor_id: string
  action: string
  entity_type: string
  entity_id: string | null
  occurred_at: string
}

export type PrescriptionTemplateItem = Omit<PrescriptionItem, 'visit_id' | 'prescribed_by'> & {
  template_id: string
  doctor_id: string
}

export type PrescriptionTemplateInvestigation = {
  id: string
  clinic_id: string
  template_id: string
  doctor_id: string
  investigation: string
  sort_order: number
}

export type PrescriptionTemplateAdvice = {
  id: string
  clinic_id: string
  template_id: string
  doctor_id: string
  advice: string
  sort_order: number
}

export type DoctorAdviceSnippet = {
  id: string
  clinic_id: string
  doctor_id: string
  advice: string
  usage_count: number
  last_used_at: string | null
  created_at: string
}

export type ClinicPrescriptionCounter = {
  clinic_id: string
  calendar_year: number
  last_value: number
}

export interface Database {
  public: {
    Tables: {
      clinics: {
        Row: Clinic
        Insert: Pick<Clinic, 'name'> & Partial<Omit<Clinic, 'id' | 'name'>>
        Update: Partial<Omit<Clinic, 'id' | 'created_at'>>
        Relationships: []
      }
      profiles: {
        Row: Profile
        Insert: Pick<Profile, 'id' | 'clinic_id' | 'full_name'> & Partial<Profile>
        Update: Partial<Pick<Profile, 'full_name' | 'display_name' | 'qualification' | 'specialization' | 'medical_registration_number' | 'additional_credentials' | 'signature_path' | 'updated_at'>>
        Relationships: []
      }
      patients: {
        Row: Patient
        Insert: Pick<Patient, 'clinic_id' | 'medical_record_number' | 'first_name' | 'last_name' | 'date_of_birth' | 'sex'> & Partial<Patient>
        Update: Partial<Omit<Patient, 'id' | 'clinic_id' | 'created_by' | 'created_at'>>
        Relationships: []
      }
      visits: {
        Row: Visit
        Insert: Pick<Visit, 'clinic_id' | 'patient_id' | 'clinician_id' | 'reason'> & Partial<Visit>
        Update: Partial<Omit<Visit, 'id' | 'clinic_id' | 'patient_id' | 'clinician_id' | 'created_at'>>
        Relationships: []
      }
      patient_allergies: {
        Row: PatientAllergy
        Insert: Pick<PatientAllergy, 'clinic_id' | 'patient_id' | 'allergen' | 'recorded_by'> & Partial<PatientAllergy>
        Update: Partial<Omit<PatientAllergy, 'id' | 'clinic_id' | 'patient_id' | 'recorded_by' | 'created_at'>>
        Relationships: []
      }
      visit_complaints: {
        Row: VisitComplaint
        Insert: Pick<VisitComplaint, 'clinic_id' | 'visit_id' | 'symptom'> & Partial<VisitComplaint>
        Update: Partial<Omit<VisitComplaint, 'id' | 'clinic_id' | 'visit_id' | 'created_at'>>
        Relationships: []
      }
      examination_findings: {
        Row: ExaminationFinding
        Insert: Pick<ExaminationFinding, 'clinic_id' | 'visit_id'> & Partial<ExaminationFinding>
        Update: Partial<Omit<ExaminationFinding, 'id' | 'clinic_id' | 'visit_id' | 'created_at'>>
        Relationships: []
      }
      visit_diagnoses: {
        Row: VisitDiagnosis
        Insert: Pick<VisitDiagnosis, 'clinic_id' | 'visit_id' | 'diagnosis'> & Partial<VisitDiagnosis>
        Update: Partial<Omit<VisitDiagnosis, 'id' | 'clinic_id' | 'visit_id' | 'created_at'>>
        Relationships: []
      }
      visit_investigations: {
        Row: VisitInvestigation
        Insert: Pick<VisitInvestigation, 'clinic_id' | 'visit_id' | 'investigation'> & Partial<VisitInvestigation>
        Update: Partial<Omit<VisitInvestigation, 'id' | 'clinic_id' | 'visit_id' | 'created_at'>>
        Relationships: []
      }
      visit_advice: {
        Row: VisitAdvice
        Insert: Pick<VisitAdvice, 'clinic_id' | 'visit_id' | 'advice'> & Partial<VisitAdvice>
        Update: Partial<Omit<VisitAdvice, 'id' | 'clinic_id' | 'visit_id' | 'created_at'>>
        Relationships: []
      }
      vitals: {
        Row: Vital
        Insert: Pick<Vital, 'clinic_id' | 'visit_id' | 'recorded_by'> & Partial<Vital>
        Update: Partial<Omit<Vital, 'id' | 'clinic_id' | 'visit_id' | 'recorded_by'>>
        Relationships: []
      }
      medications: {
        Row: Medication
        Insert: Pick<Medication, 'clinic_id' | 'created_by'> & Partial<Medication>
        Update: Partial<Omit<Medication, 'id' | 'clinic_id' | 'created_by' | 'created_at'>>
        Relationships: []
      }
      prescription_items: {
        Row: PrescriptionItem
        Insert: Pick<PrescriptionItem, 'clinic_id' | 'visit_id' | 'prescribed_by' | 'food_timing'> & Partial<PrescriptionItem>
        Update: Partial<Omit<PrescriptionItem, 'id' | 'clinic_id' | 'visit_id' | 'prescribed_by' | 'created_at'>>
        Relationships: []
      }
      doctor_medication_preferences: {
        Row: DoctorMedicationPreference
        Insert: Pick<DoctorMedicationPreference, 'clinic_id' | 'doctor_id' | 'medication_id'> & Partial<DoctorMedicationPreference>
        Update: Partial<Pick<DoctorMedicationPreference, 'usage_count' | 'last_used_at' | 'is_favorite' | 'updated_at'>>
        Relationships: []
      }
      prescription_templates: {
        Row: PrescriptionTemplate
        Insert: Pick<PrescriptionTemplate, 'clinic_id' | 'doctor_id' | 'name'> & Partial<PrescriptionTemplate>
        Update: Partial<Pick<PrescriptionTemplate, 'name' | 'updated_at'>>
        Relationships: []
      }
      prescription_template_items: {
        Row: PrescriptionTemplateItem
        Insert: Pick<PrescriptionTemplateItem, 'clinic_id' | 'template_id' | 'doctor_id' | 'food_timing'> & Partial<PrescriptionTemplateItem>
        Update: Partial<PrescriptionTemplateItem>
        Relationships: []
      }
      prescription_template_investigations: {
        Row: PrescriptionTemplateInvestigation
        Insert: Pick<PrescriptionTemplateInvestigation, 'clinic_id' | 'template_id' | 'doctor_id' | 'investigation'> & Partial<PrescriptionTemplateInvestigation>
        Update: Partial<PrescriptionTemplateInvestigation>
        Relationships: []
      }
      prescription_template_advice: {
        Row: PrescriptionTemplateAdvice
        Insert: Pick<PrescriptionTemplateAdvice, 'clinic_id' | 'template_id' | 'doctor_id' | 'advice'> & Partial<PrescriptionTemplateAdvice>
        Update: Partial<PrescriptionTemplateAdvice>
        Relationships: []
      }
      doctor_advice_snippets: {
        Row: DoctorAdviceSnippet
        Insert: Pick<DoctorAdviceSnippet, 'clinic_id' | 'doctor_id' | 'advice'> & Partial<DoctorAdviceSnippet>
        Update: Partial<Pick<DoctorAdviceSnippet, 'usage_count' | 'last_used_at'>>
        Relationships: []
      }
      clinic_prescription_counters: {
        Row: ClinicPrescriptionCounter
        Insert: ClinicPrescriptionCounter
        Update: Pick<ClinicPrescriptionCounter, 'last_value'>
        Relationships: []
      }
      appointments: {
        Row: Appointment
        Insert: Pick<Appointment, 'clinic_id' | 'patient_id' | 'starts_at' | 'created_by'> & Partial<Appointment>
        Update: Partial<Omit<Appointment, 'id' | 'clinic_id' | 'patient_id' | 'created_by' | 'created_at'>>
        Relationships: []
      }
      patient_vaccinations: {
        Row: PatientVaccination
        Insert: Pick<PatientVaccination, 'clinic_id' | 'patient_id' | 'vaccine_name' | 'created_by'> & Partial<PatientVaccination>
        Update: Partial<Omit<PatientVaccination, 'id' | 'clinic_id' | 'patient_id' | 'created_by' | 'created_at'>>
        Relationships: []
      }
      patient_investigations: {
        Row: PatientInvestigation
        Insert: Pick<PatientInvestigation, 'clinic_id' | 'patient_id' | 'name' | 'created_by'> & Partial<PatientInvestigation>
        Update: Partial<Omit<PatientInvestigation, 'id' | 'clinic_id' | 'patient_id' | 'created_by' | 'created_at'>>
        Relationships: []
      }
      patient_documents: {
        Row: PatientDocument
        Insert: Pick<PatientDocument, 'clinic_id' | 'patient_id' | 'title' | 'storage_path' | 'content_type' | 'size_bytes' | 'uploaded_by'> & Partial<PatientDocument>
        Update: Partial<Pick<PatientDocument, 'title' | 'category' | 'investigation_id'>>
        Relationships: []
      }
      patient_growth_measurements: {
        Row: GrowthMeasurement
        Insert: Pick<GrowthMeasurement, 'clinic_id' | 'patient_id' | 'recorded_by'> & Partial<GrowthMeasurement>
        Update: Partial<Omit<GrowthMeasurement, 'id' | 'clinic_id' | 'patient_id' | 'recorded_by' | 'created_at' | 'bmi'>>
        Relationships: []
      }
      invoices: {
        Row: Invoice
        Insert: Pick<Invoice, 'clinic_id' | 'patient_id' | 'invoice_number' | 'created_by'> & Partial<Invoice>
        Update: Partial<Omit<Invoice, 'id' | 'clinic_id' | 'patient_id' | 'invoice_number' | 'created_by' | 'created_at' | 'total'>>
        Relationships: []
      }
      invoice_items: {
        Row: InvoiceItem
        Insert: Pick<InvoiceItem, 'clinic_id' | 'invoice_id' | 'description' | 'unit_price'> & Partial<InvoiceItem>
        Update: Partial<Omit<InvoiceItem, 'id' | 'clinic_id' | 'invoice_id' | 'line_total'>>
        Relationships: []
      }
      audit_events: {
        Row: AuditEvent
        Insert: Pick<AuditEvent, 'clinic_id' | 'actor_id' | 'action' | 'entity_type'> & Partial<AuditEvent>
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      current_clinic_id: {
        Args: never
        Returns: string
      }
      current_user_is_doctor: {
        Args: never
        Returns: boolean
      }
      current_user_has_role: {
        Args: { p_roles: string[] }
        Returns: boolean
      }
      record_audit_event: {
        Args: { p_action: string; p_entity_type: string; p_entity_id?: string | null }
        Returns: undefined
      }
      update_staff_role: {
        Args: { p_profile_id: string; p_role: StaffRole }
        Returns: undefined
      }
      create_consultation: {
        Args: {
          p_patient_id: string
          p_visited_at: string
          p_vitals: Json
          p_complaints: Json
          p_examination: Json
          p_diagnoses: Json
          p_medications: Json
          p_investigations: Json
          p_advice: Json
          p_follow_up: Json
        }
        Returns: string
      }
      set_medication_favorite: {
        Args: { p_medication_id: string; p_is_favorite: boolean }
        Returns: undefined
      }
      save_prescription_template: {
        Args: { p_name: string; p_medications: Json; p_investigations: Json; p_advice: Json }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
