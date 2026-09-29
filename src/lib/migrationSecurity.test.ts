import { describe, expect, it } from 'vitest'
import migration from '../../supabase/migrations/202609260001_phase1_foundation.sql?raw'
import consultationMigration from '../../supabase/migrations/202609260002_consultations.sql?raw'
import prescriptionMigration from '../../supabase/migrations/202609260003_prescriptions.sql?raw'
import printingMigration from '../../supabase/migrations/202609260004_printing_settings.sql?raw'
import phaseFourMigration from '../../supabase/migrations/202609290005_phase4_clinic_portal.sql?raw'

const protectedTables = ['clinics', 'profiles', 'patients', 'visits', 'vitals']
const consultationTables = ['patient_allergies', 'visit_complaints', 'examination_findings', 'visit_diagnoses', 'visit_investigations', 'visit_advice']
const prescriptionTables = ['medications', 'prescription_items', 'doctor_medication_preferences', 'prescription_templates', 'prescription_template_items', 'prescription_template_investigations', 'prescription_template_advice', 'doctor_advice_snippets']

describe('Phase 1 migration security', () => {
  it.each(protectedTables)('enables and forces RLS on %s', (table) => {
    expect(migration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
    expect(migration).toMatch(new RegExp(`alter table public\\.${table} force row level security`, 'i'))
  })

  it('denies anonymous table access and scopes policies through clinic membership', () => {
    expect(migration).toContain('revoke all on public.clinics, public.profiles, public.patients, public.visits, public.vitals from anon')
    expect(migration.match(/clinic_id = public\.current_clinic_id\(\)/g)?.length).toBeGreaterThanOrEqual(10)
    expect(migration).toContain('where p.id = auth.uid()')
  })

  it('enforces cross-clinic integrity for patients, visits, and vitals', () => {
    expect(migration).toContain('patients_creator_in_clinic_fk')
    expect(migration).toContain('visits_patient_in_clinic_fk')
    expect(migration).toContain('visits_clinician_in_clinic_fk')
    expect(migration).toContain('vitals_visit_in_clinic_fk')
    expect(migration).toContain('vitals_recorder_in_clinic_fk')
  })

  it('does not grant generated identifiers or timestamps for client inserts', () => {
    const patientGrant = migration.match(/grant insert \(([\s\S]*?)\) on public\.patients to authenticated;/i)?.[1] ?? ''
    expect(patientGrant).not.toMatch(/\bid\b/)
    expect(patientGrant).not.toContain('created_at')
    expect(patientGrant).not.toContain('updated_at')
  })
})

describe('Phase 3 migration security', () => {
  it.each(prescriptionTables)('enables and forces RLS on %s', (table) => {
    expect(prescriptionMigration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
    expect(prescriptionMigration).toMatch(new RegExp(`alter table public\\.${table} force row level security`, 'i'))
  })

  it('denies anonymous access and keeps the extended save RPC under caller RLS', () => {
    expect(prescriptionMigration).toContain('from anon, authenticated')
    const functionBody = prescriptionMigration.slice(prescriptionMigration.indexOf('create function public.create_consultation'))
    expect(functionBody).not.toMatch(/security\s+definer/i)
    expect(prescriptionMigration).toContain('drop function public.create_consultation')
  })

  it('prevents cross-clinic visit, medication, prescriber, and template ownership links', () => {
    expect(prescriptionMigration).toContain('prescription_items_visit_in_clinic_fk')
    expect(prescriptionMigration).toContain('prescription_items_medication_in_clinic_fk')
    expect(prescriptionMigration).toContain('prescription_items_prescriber_in_clinic_fk')
    expect(prescriptionMigration).toContain('prescription_template_items_template_owner_fk')
    expect(prescriptionMigration).toContain('prescription_template_items_medication_in_clinic_fk')
  })
})

describe('Phase 2 migration security', () => {
  it.each(consultationTables)('enables and forces RLS on %s', (table) => {
    expect(consultationMigration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
    expect(consultationMigration).toMatch(new RegExp(`alter table public\\.${table} force row level security`, 'i'))
    expect(consultationMigration).toMatch(new RegExp(`create policy ${table}\\w*select\\w*own_clinic`, 'i'))
  })

  it('denies anonymous access and scopes each policy to the current clinic', () => {
    expect(consultationMigration).toContain('from anon')
    expect(consultationMigration.match(/clinic_id = public\.current_clinic_id\(\)/g)?.length).toBeGreaterThanOrEqual(11)
  })

  it('uses composite clinic foreign keys for every patient or visit relation', () => {
    expect(consultationMigration).toContain('patient_allergies_patient_in_clinic_fk')
    for (const table of consultationTables.filter((table) => table !== 'patient_allergies')) {
      expect(consultationMigration).toContain(`${table}_visit_in_clinic_fk`)
    }
  })

  it('keeps consultation creation under caller RLS and grants required column access', () => {
    const functionBody = consultationMigration.slice(consultationMigration.indexOf('create or replace function public.create_consultation'))
    expect(functionBody).not.toMatch(/security\s+definer/i)
    expect(consultationMigration).toContain('grant insert (\n  follow_up_type')
    expect(consultationMigration).toContain('Patient is not accessible')
  })
})

describe('Phase 3B migration security', () => {
  it('uses private storage and clinic-scoped asset paths', () => {
    expect(printingMigration).toContain("values ('clinic-assets', 'clinic-assets', false")
    expect(printingMigration).toContain("bucket_id = 'clinic-assets'")
    expect(printingMigration).toContain("(storage.foldername(name))[2] = public.current_clinic_id()::text")
    expect(printingMigration).toContain("(storage.foldername(name))[4] = auth.uid()::text")
    expect(printingMigration).not.toMatch(/create policy[\s\S]*public\s*=\s*true/i)
    const updatePolicy = printingMigration.slice(
      printingMigration.indexOf('create policy clinic_assets_doctor_update'),
      printingMigration.indexOf('create policy clinic_assets_doctor_delete'),
    )
    expect(updatePolicy.match(/\(storage\.foldername\(name\)\)\[4\] = auth\.uid\(\)::text/g)).toHaveLength(2)
  })

  it('enforces doctor-only clinical access at database level', () => {
    expect(printingMigration).toContain('current_user_is_doctor()')
    expect(printingMigration).toContain("raise exception 'Only doctors can create consultations'")
    expect(printingMigration.match(/public\.current_user_is_doctor\(\)/g)?.length).toBeGreaterThan(35)
    expect(printingMigration).toContain('drop policy prescription_items_insert_own_clinic')
    expect(printingMigration).toContain('create policy visit_diagnoses_doctor_insert')
  })

  it('generates clinic/year scoped prescription numbers without browser sequencing', () => {
    expect(printingMigration).toContain('create table public.clinic_prescription_counters')
    expect(printingMigration).toContain('on conflict (clinic_id, calendar_year) do update')
    expect(printingMigration).toContain("new.prescription_number := 'RX-'")
    expect(printingMigration).toContain('visits_clinic_prescription_number_key')
  })
})

const phaseFourTables = ['appointments', 'patient_vaccinations', 'patient_investigations', 'patient_documents', 'patient_growth_measurements', 'invoices', 'invoice_items', 'audit_events']

describe('Phase 4 migration security', () => {
  it.each(phaseFourTables)('enables and forces RLS on %s', (table) => {
    expect(phaseFourMigration).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, 'i'))
    expect(phaseFourMigration).toMatch(new RegExp(`alter table public\\.${table} force row level security`, 'i'))
  })

  it('uses clinic-scoped composite foreign keys for every patient record', () => {
    expect(phaseFourMigration).toContain('appointments_patient_in_clinic_fk')
    expect(phaseFourMigration).toContain('patient_vaccinations_patient_in_clinic_fk')
    expect(phaseFourMigration).toContain('patient_investigations_patient_in_clinic_fk')
    expect(phaseFourMigration).toContain('patient_documents_patient_in_clinic_fk')
    expect(phaseFourMigration).toContain('patient_growth_patient_in_clinic_fk')
    expect(phaseFourMigration).toContain('invoices_patient_in_clinic_fk')
  })

  it('keeps documents private and audit payloads free of medical content', () => {
    expect(phaseFourMigration).toContain("values ('patient-documents', 'patient-documents', false")
    expect(phaseFourMigration).toContain("(storage.foldername(name))[2] = public.current_clinic_id()::text")
    const auditTable = phaseFourMigration.match(/create table public\.audit_events \(([\s\S]*?)\n\);/i)?.[1] ?? ''
    expect(auditTable).not.toMatch(/payload|medical_data|patient_name|notes/i)
    expect(auditTable).toMatch(/action text[\s\S]*entity_type text[\s\S]*entity_id uuid/i)
    expect(phaseFourMigration).toContain('record_audit_event(p_action text, p_entity_type text, p_entity_id uuid default null)')
  })

  it('enforces role checks in database policies', () => {
    expect(phaseFourMigration).toContain("array['owner', 'admin', 'doctor']")
    expect(phaseFourMigration).toContain("array['owner','admin','doctor','reception','staff']")
    expect(phaseFourMigration).toContain("array['owner','admin','reception','staff']")
    for (const policy of ['vaccinations_select_own_clinic', 'investigations_select_own_clinic', 'documents_select_own_clinic', 'growth_select_own_clinic']) {
      const start = phaseFourMigration.indexOf(`create policy ${policy}`)
      expect(phaseFourMigration.slice(start, start + 280)).toContain('public.current_user_is_doctor()')
    }
  })
})
