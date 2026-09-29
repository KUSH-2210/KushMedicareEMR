-- Phase 2: structured patient consultations.

alter table public.visits
  add column follow_up_type text not null default 'none',
  add column follow_up_interval_value smallint,
  add column follow_up_interval_unit text,
  add column follow_up_date date,
  add column follow_up_notes text,
  add constraint visits_follow_up_type_check
    check (follow_up_type in ('none', 'interval', 'date')),
  add constraint visits_follow_up_interval_unit_check
    check (follow_up_interval_unit is null or follow_up_interval_unit in ('days', 'weeks', 'months')),
  add constraint visits_follow_up_notes_check
    check (follow_up_notes is null or char_length(follow_up_notes) <= 2000),
  add constraint visits_follow_up_shape_check check (
    (follow_up_type = 'none' and follow_up_interval_value is null and follow_up_interval_unit is null and follow_up_date is null)
    or
    (follow_up_type = 'interval' and follow_up_interval_value between 1 and 365 and follow_up_interval_unit is not null and follow_up_date is null)
    or
    (follow_up_type = 'date' and follow_up_interval_value is null and follow_up_interval_unit is null and follow_up_date is not null)
  );

create table public.patient_allergies (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null,
  allergen text not null check (char_length(trim(allergen)) between 1 and 200),
  reaction text check (reaction is null or char_length(reaction) <= 500),
  severity text not null default 'unknown' check (severity in ('mild', 'moderate', 'severe', 'unknown')),
  is_active boolean not null default true,
  recorded_by uuid not null,
  created_at timestamptz not null default now(),
  constraint patient_allergies_patient_in_clinic_fk foreign key (patient_id, clinic_id)
    references public.patients(id, clinic_id) on delete restrict,
  constraint patient_allergies_recorder_in_clinic_fk foreign key (recorded_by, clinic_id)
    references public.profiles(id, clinic_id) on delete restrict,
  unique (id, clinic_id)
);

create table public.visit_complaints (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  visit_id uuid not null,
  symptom text not null check (char_length(trim(symptom)) between 1 and 200),
  duration_value numeric(6,2),
  duration_unit text,
  notes text check (notes is null or char_length(notes) <= 2000),
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint visit_complaints_visit_in_clinic_fk foreign key (visit_id, clinic_id)
    references public.visits(id, clinic_id) on delete cascade,
  constraint visit_complaints_duration_check check (
    (duration_value is null and duration_unit is null)
    or
    (duration_value > 0 and duration_unit in ('hours', 'days', 'weeks', 'months'))
  )
);

create table public.examination_findings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  visit_id uuid not null,
  general_condition text not null default 'not_assessed'
    check (general_condition in ('well', 'fair', 'ill', 'critical', 'not_assessed')),
  pallor text not null default 'not_assessed' check (pallor in ('absent', 'present', 'not_assessed')),
  icterus text not null default 'not_assessed' check (icterus in ('absent', 'present', 'not_assessed')),
  cyanosis text not null default 'not_assessed' check (cyanosis in ('absent', 'present', 'not_assessed')),
  clubbing text not null default 'not_assessed' check (clubbing in ('absent', 'present', 'not_assessed')),
  edema text not null default 'not_assessed' check (edema in ('absent', 'present', 'not_assessed')),
  lymphadenopathy text not null default 'not_assessed' check (lymphadenopathy in ('absent', 'present', 'not_assessed')),
  cvs text check (cvs is null or char_length(cvs) <= 5000),
  respiratory_system text check (respiratory_system is null or char_length(respiratory_system) <= 5000),
  abdomen text check (abdomen is null or char_length(abdomen) <= 5000),
  cns text check (cns is null or char_length(cns) <= 5000),
  local_examination text check (local_examination is null or char_length(local_examination) <= 5000),
  other_findings text check (other_findings is null or char_length(other_findings) <= 5000),
  created_at timestamptz not null default now(),
  constraint examination_findings_visit_in_clinic_fk foreign key (visit_id, clinic_id)
    references public.visits(id, clinic_id) on delete cascade,
  unique (visit_id, clinic_id)
);

create table public.visit_diagnoses (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  visit_id uuid not null,
  diagnosis text not null check (char_length(trim(diagnosis)) between 1 and 300),
  notes text check (notes is null or char_length(notes) <= 2000),
  is_primary boolean not null default false,
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint visit_diagnoses_visit_in_clinic_fk foreign key (visit_id, clinic_id)
    references public.visits(id, clinic_id) on delete cascade
);

create unique index visit_diagnoses_one_primary_idx
  on public.visit_diagnoses(visit_id)
  where is_primary;

create table public.visit_investigations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  visit_id uuid not null,
  investigation text not null check (char_length(trim(investigation)) between 1 and 300),
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint visit_investigations_visit_in_clinic_fk foreign key (visit_id, clinic_id)
    references public.visits(id, clinic_id) on delete cascade
);

create table public.visit_advice (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  visit_id uuid not null,
  advice text not null check (char_length(trim(advice)) between 1 and 2000),
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint visit_advice_visit_in_clinic_fk foreign key (visit_id, clinic_id)
    references public.visits(id, clinic_id) on delete cascade
);

create index patient_allergies_active_idx on public.patient_allergies(clinic_id, patient_id) where is_active;
create index visit_complaints_visit_idx on public.visit_complaints(clinic_id, visit_id, sort_order);
create index examination_findings_visit_idx on public.examination_findings(clinic_id, visit_id);
create index visit_diagnoses_visit_idx on public.visit_diagnoses(clinic_id, visit_id, sort_order);
create index visit_investigations_visit_idx on public.visit_investigations(clinic_id, visit_id, sort_order);
create index visit_advice_visit_idx on public.visit_advice(clinic_id, visit_id, sort_order);

alter table public.patient_allergies enable row level security;
alter table public.visit_complaints enable row level security;
alter table public.examination_findings enable row level security;
alter table public.visit_diagnoses enable row level security;
alter table public.visit_investigations enable row level security;
alter table public.visit_advice enable row level security;

alter table public.patient_allergies force row level security;
alter table public.visit_complaints force row level security;
alter table public.examination_findings force row level security;
alter table public.visit_diagnoses force row level security;
alter table public.visit_investigations force row level security;
alter table public.visit_advice force row level security;

create policy patient_allergies_select_own_clinic on public.patient_allergies
for select to authenticated using (clinic_id = public.current_clinic_id());

create policy visit_complaints_select_own_clinic on public.visit_complaints
for select to authenticated using (clinic_id = public.current_clinic_id());
create policy visit_complaints_insert_own_clinic on public.visit_complaints
for insert to authenticated with check (clinic_id = public.current_clinic_id());

create policy examination_findings_select_own_clinic on public.examination_findings
for select to authenticated using (clinic_id = public.current_clinic_id());
create policy examination_findings_insert_own_clinic on public.examination_findings
for insert to authenticated with check (clinic_id = public.current_clinic_id());

create policy visit_diagnoses_select_own_clinic on public.visit_diagnoses
for select to authenticated using (clinic_id = public.current_clinic_id());
create policy visit_diagnoses_insert_own_clinic on public.visit_diagnoses
for insert to authenticated with check (clinic_id = public.current_clinic_id());

create policy visit_investigations_select_own_clinic on public.visit_investigations
for select to authenticated using (clinic_id = public.current_clinic_id());
create policy visit_investigations_insert_own_clinic on public.visit_investigations
for insert to authenticated with check (clinic_id = public.current_clinic_id());

create policy visit_advice_select_own_clinic on public.visit_advice
for select to authenticated using (clinic_id = public.current_clinic_id());
create policy visit_advice_insert_own_clinic on public.visit_advice
for insert to authenticated with check (clinic_id = public.current_clinic_id());

revoke all on public.patient_allergies, public.visit_complaints, public.examination_findings,
  public.visit_diagnoses, public.visit_investigations, public.visit_advice from anon;
revoke all on public.patient_allergies, public.visit_complaints, public.examination_findings,
  public.visit_diagnoses, public.visit_investigations, public.visit_advice from authenticated;

grant select on public.patient_allergies, public.visit_complaints, public.examination_findings,
  public.visit_diagnoses, public.visit_investigations, public.visit_advice to authenticated;
grant insert (
  follow_up_type, follow_up_interval_value, follow_up_interval_unit, follow_up_date, follow_up_notes
) on public.visits to authenticated;
grant insert (clinic_id, visit_id, symptom, duration_value, duration_unit, notes, sort_order)
  on public.visit_complaints to authenticated;
grant insert (
  clinic_id, visit_id, general_condition, pallor, icterus, cyanosis, clubbing, edema,
  lymphadenopathy, cvs, respiratory_system, abdomen, cns, local_examination, other_findings
) on public.examination_findings to authenticated;
grant insert (clinic_id, visit_id, diagnosis, notes, is_primary, sort_order)
  on public.visit_diagnoses to authenticated;
grant insert (clinic_id, visit_id, investigation, sort_order)
  on public.visit_investigations to authenticated;
grant insert (clinic_id, visit_id, advice, sort_order)
  on public.visit_advice to authenticated;

create or replace function public.create_consultation(
  p_patient_id uuid,
  p_visited_at timestamptz,
  p_vitals jsonb,
  p_complaints jsonb,
  p_examination jsonb,
  p_diagnoses jsonb,
  p_investigations jsonb,
  p_advice jsonb,
  p_follow_up jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_clinic_id uuid := public.current_clinic_id();
  v_user_id uuid := auth.uid();
  v_visit_id uuid;
  v_reason text;
begin
  if v_clinic_id is null or v_user_id is null then
    raise exception 'Clinic membership is required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.patients
    where id = p_patient_id and clinic_id = v_clinic_id
  ) then
    raise exception 'Patient is not accessible' using errcode = '42501';
  end if;

  v_reason := coalesce(
    nullif(trim(p_complaints -> 0 ->> 'name'), ''),
    nullif(trim(p_diagnoses -> 0 ->> 'name'), ''),
    'Consultation'
  );

  insert into public.visits (
    clinic_id, patient_id, clinician_id, visited_at, reason,
    follow_up_type, follow_up_interval_value, follow_up_interval_unit,
    follow_up_date, follow_up_notes
  ) values (
    v_clinic_id,
    p_patient_id,
    v_user_id,
    coalesce(p_visited_at, now()),
    v_reason,
    coalesce(nullif(p_follow_up ->> 'type', ''), 'none'),
    nullif(p_follow_up ->> 'intervalValue', '')::smallint,
    nullif(p_follow_up ->> 'intervalUnit', ''),
    nullif(p_follow_up ->> 'date', '')::date,
    nullif(trim(p_follow_up ->> 'notes'), '')
  ) returning id into v_visit_id;

  if p_vitals is not null and p_vitals <> '{}'::jsonb then
    insert into public.vitals (
      clinic_id, visit_id, recorded_by, systolic_bp, diastolic_bp, pulse_bpm,
      temperature_c, respiratory_rate, oxygen_saturation, weight_kg, height_cm
    ) values (
      v_clinic_id, v_visit_id, v_user_id,
      nullif(p_vitals ->> 'systolicBp', '')::smallint,
      nullif(p_vitals ->> 'diastolicBp', '')::smallint,
      nullif(p_vitals ->> 'pulseBpm', '')::smallint,
      nullif(p_vitals ->> 'temperatureC', '')::numeric,
      nullif(p_vitals ->> 'respiratoryRate', '')::smallint,
      nullif(p_vitals ->> 'oxygenSaturation', '')::numeric,
      nullif(p_vitals ->> 'weightKg', '')::numeric,
      nullif(p_vitals ->> 'heightCm', '')::numeric
    );
  end if;

  insert into public.visit_complaints (
    clinic_id, visit_id, symptom, duration_value, duration_unit, notes, sort_order
  )
  select
    v_clinic_id, v_visit_id, trim(item.value ->> 'name'),
    nullif(item.value ->> 'durationValue', '')::numeric,
    nullif(item.value ->> 'durationUnit', ''),
    nullif(trim(item.value ->> 'notes'), ''),
    (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_complaints, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(item.value ->> 'name'), '') is not null;

  if p_examination is not null and p_examination <> '{}'::jsonb then
    insert into public.examination_findings (
      clinic_id, visit_id, general_condition, pallor, icterus, cyanosis, clubbing,
      edema, lymphadenopathy, cvs, respiratory_system, abdomen, cns,
      local_examination, other_findings
    ) values (
      v_clinic_id, v_visit_id,
      coalesce(nullif(p_examination ->> 'generalCondition', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'pallor', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'icterus', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'cyanosis', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'clubbing', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'edema', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'lymphadenopathy', ''), 'not_assessed'),
      nullif(trim(p_examination ->> 'cvs'), ''),
      nullif(trim(p_examination ->> 'respiratorySystem'), ''),
      nullif(trim(p_examination ->> 'abdomen'), ''),
      nullif(trim(p_examination ->> 'cns'), ''),
      nullif(trim(p_examination ->> 'localExamination'), ''),
      nullif(trim(p_examination ->> 'otherFindings'), '')
    );
  end if;

  insert into public.visit_diagnoses (
    clinic_id, visit_id, diagnosis, notes, is_primary, sort_order
  )
  select
    v_clinic_id, v_visit_id, trim(item.value ->> 'name'),
    nullif(trim(item.value ->> 'notes'), ''),
    coalesce((item.value ->> 'isPrimary')::boolean, false),
    (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_diagnoses, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(item.value ->> 'name'), '') is not null;

  insert into public.visit_investigations (clinic_id, visit_id, investigation, sort_order)
  select v_clinic_id, v_visit_id, trim(item.value #>> '{}'), (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_investigations, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(item.value #>> '{}'), '') is not null;

  insert into public.visit_advice (clinic_id, visit_id, advice, sort_order)
  select v_clinic_id, v_visit_id, trim(item.value #>> '{}'), (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_advice, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(item.value #>> '{}'), '') is not null;

  return v_visit_id;
end;
$$;

revoke all on function public.create_consultation(uuid, timestamptz, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_consultation(uuid, timestamptz, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
