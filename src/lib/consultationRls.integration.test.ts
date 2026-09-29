// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import phaseOne from '../../supabase/migrations/202609260001_phase1_foundation.sql?raw'
import phaseTwo from '../../supabase/migrations/202609260002_consultations.sql?raw'
import phaseThree from '../../supabase/migrations/202609260003_prescriptions.sql?raw'
import phaseThreeB from '../../supabase/migrations/202609260004_printing_settings.sql?raw'
import phaseFour from '../../supabase/migrations/202609290005_phase4_clinic_portal.sql?raw'

const clinicA = '10000000-0000-4000-8000-000000000001'
const clinicB = '20000000-0000-4000-8000-000000000002'
const userA = '30000000-0000-4000-8000-000000000003'
const userB = '40000000-0000-4000-8000-000000000004'
const staffA = '90000000-0000-4000-8000-000000000009'
const patientA = '50000000-0000-4000-8000-000000000005'
const patientB = '60000000-0000-4000-8000-000000000006'
const medicationB = '70000000-0000-4000-8000-000000000007'
const medicationA = '80000000-0000-4000-8000-000000000008'

describe('consultation RLS integration', () => {
  let db: PGlite

  beforeAll(async () => {
    db = new PGlite({ extensions: { pgcrypto } })
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      create schema storage;
      create table storage.buckets (
        id text primary key, name text not null, public boolean not null default false,
        file_size_limit bigint, allowed_mime_types text[]
      );
      create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null);
      create function storage.foldername(value text) returns text[] language sql immutable as $$
        select case when position('/' in value) = 0 then array[]::text[] else string_to_array(regexp_replace(value, '/[^/]*$', ''), '/') end
      $$;
      alter table storage.objects enable row level security;
    `)
    await db.exec(phaseOne)
    await db.exec(phaseTwo)
    await db.exec(phaseThree)
    await db.exec(phaseThreeB)
    await db.exec(phaseFour)
    await db.exec(`
      insert into auth.users (id) values ('${userA}'), ('${userB}'), ('${staffA}');
      insert into public.clinics (id, name) values ('${clinicA}', 'Clinic Alpha'), ('${clinicB}', 'Clinic Beta');
      insert into public.profiles (id, clinic_id, full_name, role) values
        ('${userA}', '${clinicA}', 'Test Doctor Alpha', 'doctor'),
        ('${userB}', '${clinicB}', 'Test Doctor Beta', 'doctor'),
        ('${staffA}', '${clinicA}', 'Test Staff Alpha', 'staff');
      insert into public.patients (id, clinic_id, medical_record_number, first_name, last_name, date_of_birth, sex, created_by) values
        ('${patientA}', '${clinicA}', 'TEST-A-001', 'Alex', 'Example', '1990-01-01', 'unknown', '${userA}'),
        ('${patientB}', '${clinicB}', 'TEST-B-001', 'Blair', 'Example', '1992-01-01', 'unknown', '${userB}');
      insert into public.medications (id, clinic_id, brand_name, generic_name, strength, formulation, created_by)
        values
        ('${medicationA}', '${clinicA}', 'Test Brand A', 'Test Generic A', '5 mg', 'Tablet', '${userA}'),
        ('${medicationB}', '${clinicB}', 'Test Brand B', 'Test Generic B', '10 mg', 'Tablet', '${userB}');
      set role authenticated;
      select set_config('request.jwt.claim.sub', '${userA}', false);
    `)
  }, 30_000)

  afterAll(async () => {
    await db?.close()
  })

  it('executes all migrations and exposes only the caller clinic', async () => {
    const patients = await db.query<{ id: string }>('select id from public.patients order by id')
    expect(patients.rows.map((row) => row.id)).toEqual([patientA])
  })

  it('atomically saves all consultation sections for an accessible patient', async () => {
    const saved = await db.query<{ create_consultation: string }>(`
      select public.create_consultation(
        '${patientA}', now(),
        '{"systolicBp":120,"diastolicBp":80,"temperatureC":37,"weightKg":72,"heightCm":180}'::jsonb,
        '[{"name":"Fever","durationValue":3,"durationUnit":"days","notes":"Intermittent"},{"name":"Cough"}]'::jsonb,
        '{"generalCondition":"fair","pallor":"absent","respiratorySystem":"Clear"}'::jsonb,
        '[{"name":"Viral fever","isPrimary":true},{"name":"Mild dehydration","isPrimary":false}]'::jsonb,
        '[{"brandName":"Test Med","genericName":"Example compound","strength":"10 mg","formulation":"Tablet","doseValue":1,"doseUnit":"tablet","frequencyCode":"BD","foodTiming":"after_food","durationValue":3,"durationUnit":"days"}]'::jsonb,
        '["CBC","Urine Routine"]'::jsonb,
        '["Rest","Adequate hydration"]'::jsonb,
        '{"type":"interval","intervalValue":3,"intervalUnit":"days","notes":"Earlier if worse"}'::jsonb
      )
    `)
    const visitId = saved.rows[0].create_consultation
    const counts = await db.query<{ complaints: number; diagnoses: number; medicines: number; investigations: number; advice: number }>(`
      select
        (select count(*)::int from public.visit_complaints where visit_id = '${visitId}') complaints,
        (select count(*)::int from public.visit_diagnoses where visit_id = '${visitId}') diagnoses,
        (select count(*)::int from public.prescription_items where visit_id = '${visitId}') medicines,
        (select count(*)::int from public.visit_investigations where visit_id = '${visitId}') investigations,
        (select count(*)::int from public.visit_advice where visit_id = '${visitId}') advice
    `)
    expect(counts.rows[0]).toEqual({ complaints: 2, diagnoses: 2, medicines: 1, investigations: 2, advice: 2 })
    expect((await db.query('select * from public.vitals where visit_id = $1', [visitId])).rows).toHaveLength(1)
    expect((await db.query('select * from public.examination_findings where visit_id = $1', [visitId])).rows).toHaveLength(1)
    expect((await db.query('select * from public.doctor_medication_preferences')).rows).toHaveLength(1)
    const savedVisit = (await db.query<{ prescription_number: string }>('select prescription_number from public.visits where id = $1', [visitId])).rows[0]
    expect(savedVisit.prescription_number).toMatch(/^RX-\d{4}-\d{6}$/)
  })

  it('rejects an RPC attempt against another clinic patient', async () => {
    await expect(db.query(`
      select public.create_consultation(
        '${patientB}', now(), '{}'::jsonb, '[]'::jsonb, '{}'::jsonb,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"type":"none"}'::jsonb
      )
    `)).rejects.toThrow(/Patient is not accessible/)
  })

  it('rejects a cross-clinic medication reference and rolls back the visit', async () => {
    const before = (await db.query<{ count: number }>('select count(*)::int count from public.visits')).rows[0].count
    await expect(db.query(`
      select public.create_consultation(
        '${patientA}', now(), '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb,
        '[{"medicationId":"${medicationB}","brandName":"Test Brand B","doseValue":1,"doseUnit":"tablet","frequencyCode":"OD","foodTiming":"no_preference","durationValue":3,"durationUnit":"days"}]'::jsonb,
        '[]'::jsonb, '[]'::jsonb, '{"type":"none"}'::jsonb
      )
    `)).rejects.toThrow(/Medication is not accessible/)
    const after = (await db.query<{ count: number }>('select count(*)::int count from public.visits')).rows[0].count
    expect(after).toBe(before)
  })

  it('stores doctor-specific favorites and structured templates', async () => {
    await db.query(`select public.set_medication_favorite('${medicationA}', true)`)
    const preference = await db.query<{ is_favorite: boolean }>('select is_favorite from public.doctor_medication_preferences where medication_id = $1', [medicationA])
    expect(preference.rows[0].is_favorite).toBe(true)

    const template = await db.query<{ save_prescription_template: string }>(`
      select public.save_prescription_template(
        'Test follow-up',
        '[{"medicationId":"${medicationA}","brandName":"Test Brand A","genericName":"Test Generic A","doseValue":1,"doseUnit":"tablet","frequencyCode":"OD","foodTiming":"after_food","durationValue":5,"durationUnit":"days"}]'::jsonb,
        '["Test panel"]'::jsonb,
        '["Test advice"]'::jsonb
      )
    `)
    const templateId = template.rows[0].save_prescription_template
    expect((await db.query('select * from public.prescription_template_items where template_id = $1', [templateId])).rows).toHaveLength(1)
    expect((await db.query('select * from public.prescription_template_investigations where template_id = $1', [templateId])).rows).toHaveLength(1)
    expect((await db.query('select * from public.prescription_template_advice where template_id = $1', [templateId])).rows).toHaveLength(1)
  })

  it('prevents staff from creating consultations or clinical rows', async () => {
    const existingVisit = (await db.query<{ id: string }>('select id from public.visits limit 1')).rows[0].id
    await db.exec(`select set_config('request.jwt.claim.sub', '${staffA}', false)`)
    await expect(db.query(`
      select public.create_consultation(
        '${patientA}', now(), '{}'::jsonb, '[]'::jsonb, '{}'::jsonb,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"type":"none"}'::jsonb
      )
    `)).rejects.toThrow(/Only doctors can create consultations|row-level security/)
    await expect(db.query(`insert into public.visit_diagnoses (clinic_id, visit_id, diagnosis) values ('${clinicA}', '${existingVisit}', 'Blocked')`)).rejects.toThrow(/row-level security|permission denied/)
    await db.exec(`select set_config('request.jwt.claim.sub', '${userA}', false)`)
  })

  it('keeps prescription numbers unique and hides another clinic saved visit', async () => {
    const second = await db.query<{ create_consultation: string }>(`
      select public.create_consultation(
        '${patientA}', now(), '{}'::jsonb, '[]'::jsonb, '{}'::jsonb,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"type":"none"}'::jsonb
      )
    `)
    const numbers = await db.query<{ prescription_number: string }>('select prescription_number from public.visits order by prescription_number')
    expect(new Set(numbers.rows.map((row) => row.prescription_number)).size).toBe(numbers.rows.length)
    expect(second.rows[0].create_consultation).toBeTruthy()

    await db.exec(`select set_config('request.jwt.claim.sub', '${userB}', false)`)
    const other = await db.query<{ create_consultation: string }>(`
      select public.create_consultation(
        '${patientB}', now(), '{}'::jsonb, '[]'::jsonb, '{}'::jsonb,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '{"type":"none"}'::jsonb
      )
    `)
    const otherVisitId = other.rows[0].create_consultation
    await db.exec(`select set_config('request.jwt.claim.sub', '${userA}', false)`)
    expect((await db.query('select id from public.visits where id = $1', [otherVisitId])).rows).toHaveLength(0)
  })

  it('allows clinic operations but blocks cross-clinic Phase 4 links', async () => {
    const appointment = await db.query<{ id: string }>(`
      insert into public.appointments (clinic_id, patient_id, starts_at, created_by)
      values ('${clinicA}', '${patientA}', now(), '${userA}') returning id
    `)
    expect(appointment.rows).toHaveLength(1)
    await expect(db.query(`
      insert into public.patient_vaccinations (clinic_id, patient_id, vaccine_name, created_by)
      values ('${clinicA}', '${patientB}', 'Test vaccine', '${userA}')
    `)).rejects.toThrow(/foreign key|row-level security/)
  })

  it('lets reception manage appointments but denies clinical Phase 4 writes', async () => {
    await db.exec(`select set_config('request.jwt.claim.sub', '${staffA}', false)`)
    const appointment = await db.query<{ id: string }>(`
      insert into public.appointments (clinic_id, patient_id, starts_at, created_by)
      values ('${clinicA}', '${patientA}', now(), '${staffA}') returning id
    `)
    expect(appointment.rows).toHaveLength(1)
    await expect(db.query(`
      insert into public.patient_growth_measurements (clinic_id, patient_id, weight_kg, recorded_by)
      values ('${clinicA}', '${patientA}', 20, '${staffA}')
    `)).rejects.toThrow(/row-level security|permission denied/)
    await db.exec(`select set_config('request.jwt.claim.sub', '${userA}', false)`)
  })
})
