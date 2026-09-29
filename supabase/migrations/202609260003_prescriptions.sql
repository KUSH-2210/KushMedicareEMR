-- Phase 3: structured prescriptions, doctor preferences, and reusable templates.

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  brand_name text check (brand_name is null or char_length(trim(brand_name)) between 1 and 200),
  generic_name text check (generic_name is null or char_length(trim(generic_name)) between 1 and 200),
  formulation text check (formulation is null or char_length(formulation) <= 100),
  strength text check (strength is null or char_length(strength) <= 100),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medications_name_check check (brand_name is not null or generic_name is not null),
  constraint medications_creator_in_clinic_fk foreign key (created_by, clinic_id)
    references public.profiles(id, clinic_id) on delete restrict,
  unique (id, clinic_id)
);

create unique index medications_clinic_identity_idx on public.medications (
  clinic_id,
  lower(coalesce(brand_name, '')),
  lower(coalesce(generic_name, '')),
  lower(coalesce(strength, '')),
  lower(coalesce(formulation, ''))
);
create index medications_clinic_search_idx on public.medications(clinic_id, lower(coalesce(brand_name, generic_name)));

create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  visit_id uuid not null,
  medication_id uuid,
  prescribed_by uuid not null,
  brand_name text,
  generic_name text,
  formulation text,
  strength text,
  dose_value numeric(8,2),
  dose_unit text,
  dose_text text,
  frequency_code text,
  frequency_text text,
  food_timing text not null default 'no_preference',
  duration_value numeric(8,2),
  duration_unit text,
  duration_text text,
  instructions text,
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint prescription_items_visit_in_clinic_fk foreign key (visit_id, clinic_id)
    references public.visits(id, clinic_id) on delete cascade,
  constraint prescription_items_medication_in_clinic_fk foreign key (medication_id, clinic_id)
    references public.medications(id, clinic_id) on delete restrict,
  constraint prescription_items_prescriber_in_clinic_fk foreign key (prescribed_by, clinic_id)
    references public.profiles(id, clinic_id) on delete restrict,
  constraint prescription_items_name_check check (
    (brand_name is not null and char_length(trim(brand_name)) between 1 and 200)
    or (generic_name is not null and char_length(trim(generic_name)) between 1 and 200)
  ),
  constraint prescription_items_food_timing_check check (food_timing in ('before_food', 'after_food', 'with_food', 'no_preference')),
  constraint prescription_items_duration_check check (
    (duration_value is null and duration_unit is null)
    or (duration_value > 0 and duration_unit in ('days', 'weeks', 'months'))
  ),
  constraint prescription_items_text_lengths_check check (
    char_length(coalesce(dose_unit, '')) <= 80
    and char_length(coalesce(dose_text, '')) <= 200
    and char_length(coalesce(frequency_code, '')) <= 40
    and char_length(coalesce(frequency_text, '')) <= 200
    and char_length(coalesce(duration_text, '')) <= 200
    and char_length(coalesce(instructions, '')) <= 2000
  )
);

create index prescription_items_visit_idx on public.prescription_items(clinic_id, visit_id, sort_order);
create index prescription_items_medication_idx on public.prescription_items(clinic_id, medication_id);

create table public.doctor_medication_preferences (
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  doctor_id uuid not null,
  medication_id uuid not null,
  usage_count integer not null default 0 check (usage_count >= 0),
  last_used_at timestamptz,
  is_favorite boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (doctor_id, medication_id),
  constraint doctor_medication_preferences_doctor_in_clinic_fk foreign key (doctor_id, clinic_id)
    references public.profiles(id, clinic_id) on delete cascade,
  constraint doctor_medication_preferences_medication_in_clinic_fk foreign key (medication_id, clinic_id)
    references public.medications(id, clinic_id) on delete cascade
);

create index doctor_medication_preferences_rank_idx
  on public.doctor_medication_preferences(doctor_id, is_favorite desc, usage_count desc, last_used_at desc);

create table public.prescription_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  doctor_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescription_templates_doctor_in_clinic_fk foreign key (doctor_id, clinic_id)
    references public.profiles(id, clinic_id) on delete cascade,
  unique (id, doctor_id, clinic_id),
  unique (doctor_id, name)
);

create table public.prescription_template_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  template_id uuid not null,
  doctor_id uuid not null,
  medication_id uuid,
  brand_name text,
  generic_name text,
  formulation text,
  strength text,
  dose_value numeric(8,2),
  dose_unit text,
  dose_text text,
  frequency_code text,
  frequency_text text,
  food_timing text not null default 'no_preference' check (food_timing in ('before_food', 'after_food', 'with_food', 'no_preference')),
  duration_value numeric(8,2),
  duration_unit text,
  duration_text text,
  instructions text,
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  constraint prescription_template_items_template_owner_fk foreign key (template_id, doctor_id, clinic_id)
    references public.prescription_templates(id, doctor_id, clinic_id) on delete cascade,
  constraint prescription_template_items_medication_in_clinic_fk foreign key (medication_id, clinic_id)
    references public.medications(id, clinic_id) on delete restrict,
  constraint prescription_template_items_name_check check (brand_name is not null or generic_name is not null),
  constraint prescription_template_items_duration_check check (
    (duration_value is null and duration_unit is null)
    or (duration_value > 0 and duration_unit in ('days', 'weeks', 'months'))
  ),
  constraint prescription_template_items_text_lengths_check check (
    char_length(coalesce(dose_unit, '')) <= 80
    and char_length(coalesce(dose_text, '')) <= 200
    and char_length(coalesce(frequency_code, '')) <= 40
    and char_length(coalesce(frequency_text, '')) <= 200
    and char_length(coalesce(duration_text, '')) <= 200
    and char_length(coalesce(instructions, '')) <= 2000
  )
);

create table public.prescription_template_investigations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  template_id uuid not null,
  doctor_id uuid not null,
  investigation text not null check (char_length(trim(investigation)) between 1 and 300),
  sort_order smallint not null default 0 check (sort_order >= 0),
  constraint prescription_template_investigations_owner_fk foreign key (template_id, doctor_id, clinic_id)
    references public.prescription_templates(id, doctor_id, clinic_id) on delete cascade
);

create table public.prescription_template_advice (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  template_id uuid not null,
  doctor_id uuid not null,
  advice text not null check (char_length(trim(advice)) between 1 and 2000),
  sort_order smallint not null default 0 check (sort_order >= 0),
  constraint prescription_template_advice_owner_fk foreign key (template_id, doctor_id, clinic_id)
    references public.prescription_templates(id, doctor_id, clinic_id) on delete cascade
);

create table public.doctor_advice_snippets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  doctor_id uuid not null,
  advice text not null check (char_length(trim(advice)) between 1 and 2000),
  usage_count integer not null default 0 check (usage_count >= 0),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint doctor_advice_snippets_doctor_in_clinic_fk foreign key (doctor_id, clinic_id)
    references public.profiles(id, clinic_id) on delete cascade,
  unique (doctor_id, advice)
);

create index prescription_template_items_template_idx on public.prescription_template_items(clinic_id, template_id, sort_order);
create index prescription_template_investigations_template_idx on public.prescription_template_investigations(clinic_id, template_id, sort_order);
create index prescription_template_advice_template_idx on public.prescription_template_advice(clinic_id, template_id, sort_order);
create index doctor_advice_snippets_rank_idx on public.doctor_advice_snippets(doctor_id, usage_count desc, last_used_at desc);

create trigger medications_set_updated_at before update on public.medications
for each row execute function public.set_updated_at();
create trigger prescription_templates_set_updated_at before update on public.prescription_templates
for each row execute function public.set_updated_at();

alter table public.medications enable row level security;
alter table public.prescription_items enable row level security;
alter table public.doctor_medication_preferences enable row level security;
alter table public.prescription_templates enable row level security;
alter table public.prescription_template_items enable row level security;
alter table public.prescription_template_investigations enable row level security;
alter table public.prescription_template_advice enable row level security;
alter table public.doctor_advice_snippets enable row level security;

alter table public.medications force row level security;
alter table public.prescription_items force row level security;
alter table public.doctor_medication_preferences force row level security;
alter table public.prescription_templates force row level security;
alter table public.prescription_template_items force row level security;
alter table public.prescription_template_investigations force row level security;
alter table public.prescription_template_advice force row level security;
alter table public.doctor_advice_snippets force row level security;

create policy medications_select_own_clinic on public.medications
for select to authenticated using (clinic_id = public.current_clinic_id());
create policy medications_insert_own_clinic on public.medications
for insert to authenticated with check (clinic_id = public.current_clinic_id() and created_by = auth.uid());

create policy prescription_items_select_own_clinic on public.prescription_items
for select to authenticated using (clinic_id = public.current_clinic_id());
create policy prescription_items_insert_own_clinic on public.prescription_items
for insert to authenticated with check (clinic_id = public.current_clinic_id() and prescribed_by = auth.uid());

create policy doctor_medication_preferences_select_own on public.doctor_medication_preferences
for select to authenticated using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());
create policy doctor_medication_preferences_insert_own on public.doctor_medication_preferences
for insert to authenticated with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());
create policy doctor_medication_preferences_update_own on public.doctor_medication_preferences
for update to authenticated using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid())
with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());

create policy prescription_templates_select_own on public.prescription_templates
for select to authenticated using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());
create policy prescription_templates_insert_own on public.prescription_templates
for insert to authenticated with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());

create policy prescription_template_items_select_own on public.prescription_template_items
for select to authenticated using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());
create policy prescription_template_items_insert_own on public.prescription_template_items
for insert to authenticated with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());
create policy prescription_template_investigations_select_own on public.prescription_template_investigations
for select to authenticated using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());
create policy prescription_template_investigations_insert_own on public.prescription_template_investigations
for insert to authenticated with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());
create policy prescription_template_advice_select_own on public.prescription_template_advice
for select to authenticated using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());
create policy prescription_template_advice_insert_own on public.prescription_template_advice
for insert to authenticated with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());

create policy doctor_advice_snippets_select_own on public.doctor_advice_snippets
for select to authenticated using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());
create policy doctor_advice_snippets_insert_own on public.doctor_advice_snippets
for insert to authenticated with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());
create policy doctor_advice_snippets_update_own on public.doctor_advice_snippets
for update to authenticated using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid())
with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid());

revoke all on public.medications, public.prescription_items, public.doctor_medication_preferences,
  public.prescription_templates, public.prescription_template_items,
  public.prescription_template_investigations, public.prescription_template_advice,
  public.doctor_advice_snippets from anon, authenticated;

grant select on public.medications, public.prescription_items, public.doctor_medication_preferences,
  public.prescription_templates, public.prescription_template_items,
  public.prescription_template_investigations, public.prescription_template_advice,
  public.doctor_advice_snippets to authenticated;
grant insert (clinic_id, brand_name, generic_name, formulation, strength, created_by)
  on public.medications to authenticated;
grant insert (
  clinic_id, visit_id, medication_id, prescribed_by, brand_name, generic_name,
  formulation, strength, dose_value, dose_unit, dose_text, frequency_code,
  frequency_text, food_timing, duration_value, duration_unit, duration_text,
  instructions, sort_order
) on public.prescription_items to authenticated;
grant insert (clinic_id, doctor_id, medication_id, usage_count, last_used_at, is_favorite)
  on public.doctor_medication_preferences to authenticated;
grant update (usage_count, last_used_at, is_favorite, updated_at)
  on public.doctor_medication_preferences to authenticated;
grant insert (clinic_id, doctor_id, name) on public.prescription_templates to authenticated;
grant insert (
  clinic_id, template_id, doctor_id, medication_id, brand_name, generic_name,
  formulation, strength, dose_value, dose_unit, dose_text, frequency_code,
  frequency_text, food_timing, duration_value, duration_unit, duration_text,
  instructions, sort_order
) on public.prescription_template_items to authenticated;
grant insert (clinic_id, template_id, doctor_id, investigation, sort_order)
  on public.prescription_template_investigations to authenticated;
grant insert (clinic_id, template_id, doctor_id, advice, sort_order)
  on public.prescription_template_advice to authenticated;
grant insert (clinic_id, doctor_id, advice, usage_count, last_used_at)
  on public.doctor_advice_snippets to authenticated;
grant update (usage_count, last_used_at) on public.doctor_advice_snippets to authenticated;

drop function public.create_consultation(uuid, timestamptz, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb);

create function public.create_consultation(
  p_patient_id uuid,
  p_visited_at timestamptz,
  p_vitals jsonb,
  p_complaints jsonb,
  p_examination jsonb,
  p_diagnoses jsonb,
  p_medications jsonb,
  p_investigations jsonb,
  p_advice jsonb,
  p_follow_up jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid := public.current_clinic_id();
  v_user_id uuid := auth.uid();
  v_visit_id uuid;
  v_medication_id uuid;
  v_brand_name text;
  v_generic_name text;
  v_formulation text;
  v_strength text;
  v_reason text;
  medication_entry record;
begin
  if v_clinic_id is null or v_user_id is null then
    raise exception 'Clinic membership is required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.patients where id = p_patient_id and clinic_id = v_clinic_id) then
    raise exception 'Patient is not accessible' using errcode = '42501';
  end if;

  v_reason := coalesce(nullif(trim(p_complaints -> 0 ->> 'name'), ''), nullif(trim(p_diagnoses -> 0 ->> 'name'), ''), 'Consultation');
  insert into public.visits (
    clinic_id, patient_id, clinician_id, visited_at, reason,
    follow_up_type, follow_up_interval_value, follow_up_interval_unit, follow_up_date, follow_up_notes
  ) values (
    v_clinic_id, p_patient_id, v_user_id, coalesce(p_visited_at, now()), v_reason,
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
      nullif(p_vitals ->> 'systolicBp', '')::smallint, nullif(p_vitals ->> 'diastolicBp', '')::smallint,
      nullif(p_vitals ->> 'pulseBpm', '')::smallint, nullif(p_vitals ->> 'temperatureC', '')::numeric,
      nullif(p_vitals ->> 'respiratoryRate', '')::smallint, nullif(p_vitals ->> 'oxygenSaturation', '')::numeric,
      nullif(p_vitals ->> 'weightKg', '')::numeric, nullif(p_vitals ->> 'heightCm', '')::numeric
    );
  end if;

  insert into public.visit_complaints (clinic_id, visit_id, symptom, duration_value, duration_unit, notes, sort_order)
  select v_clinic_id, v_visit_id, trim(item.value ->> 'name'), nullif(item.value ->> 'durationValue', '')::numeric,
    nullif(item.value ->> 'durationUnit', ''), nullif(trim(item.value ->> 'notes'), ''), (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_complaints, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(item.value ->> 'name'), '') is not null;

  if p_examination is not null and p_examination <> '{}'::jsonb then
    insert into public.examination_findings (
      clinic_id, visit_id, general_condition, pallor, icterus, cyanosis, clubbing,
      edema, lymphadenopathy, cvs, respiratory_system, abdomen, cns, local_examination, other_findings
    ) values (
      v_clinic_id, v_visit_id,
      coalesce(nullif(p_examination ->> 'generalCondition', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'pallor', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'icterus', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'cyanosis', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'clubbing', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'edema', ''), 'not_assessed'),
      coalesce(nullif(p_examination ->> 'lymphadenopathy', ''), 'not_assessed'),
      nullif(trim(p_examination ->> 'cvs'), ''), nullif(trim(p_examination ->> 'respiratorySystem'), ''),
      nullif(trim(p_examination ->> 'abdomen'), ''), nullif(trim(p_examination ->> 'cns'), ''),
      nullif(trim(p_examination ->> 'localExamination'), ''), nullif(trim(p_examination ->> 'otherFindings'), '')
    );
  end if;

  insert into public.visit_diagnoses (clinic_id, visit_id, diagnosis, notes, is_primary, sort_order)
  select v_clinic_id, v_visit_id, trim(item.value ->> 'name'), nullif(trim(item.value ->> 'notes'), ''),
    coalesce((item.value ->> 'isPrimary')::boolean, false), (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_diagnoses, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(item.value ->> 'name'), '') is not null;

  for medication_entry in
    select value, ordinality from jsonb_array_elements(coalesce(p_medications, '[]'::jsonb)) with ordinality
  loop
    v_medication_id := nullif(medication_entry.value ->> 'medicationId', '')::uuid;
    if v_medication_id is not null then
      select brand_name, generic_name, formulation, strength
      into v_brand_name, v_generic_name, v_formulation, v_strength
      from public.medications where id = v_medication_id and clinic_id = v_clinic_id;
      if not found then
        raise exception 'Medication is not accessible' using errcode = '42501';
      end if;
    end if;

    if v_medication_id is null then
      select id, brand_name, generic_name, formulation, strength
      into v_medication_id, v_brand_name, v_generic_name, v_formulation, v_strength
      from public.medications
      where clinic_id = v_clinic_id
        and lower(coalesce(brand_name, '')) = lower(coalesce(medication_entry.value ->> 'brandName', ''))
        and lower(coalesce(generic_name, '')) = lower(coalesce(medication_entry.value ->> 'genericName', ''))
        and lower(coalesce(strength, '')) = lower(coalesce(medication_entry.value ->> 'strength', ''))
        and lower(coalesce(formulation, '')) = lower(coalesce(medication_entry.value ->> 'formulation', ''));
      if v_medication_id is null then
        insert into public.medications (clinic_id, brand_name, generic_name, formulation, strength, created_by)
        values (
          v_clinic_id, nullif(trim(medication_entry.value ->> 'brandName'), ''), nullif(trim(medication_entry.value ->> 'genericName'), ''),
          nullif(trim(medication_entry.value ->> 'formulation'), ''), nullif(trim(medication_entry.value ->> 'strength'), ''), v_user_id
        ) returning id, brand_name, generic_name, formulation, strength
          into v_medication_id, v_brand_name, v_generic_name, v_formulation, v_strength;
      end if;
    end if;

    insert into public.prescription_items (
      clinic_id, visit_id, medication_id, prescribed_by, brand_name, generic_name, formulation, strength,
      dose_value, dose_unit, dose_text, frequency_code, frequency_text, food_timing,
      duration_value, duration_unit, duration_text, instructions, sort_order
    ) values (
      v_clinic_id, v_visit_id, v_medication_id, v_user_id,
      v_brand_name, v_generic_name, v_formulation, v_strength,
      nullif(medication_entry.value ->> 'doseValue', '')::numeric, nullif(trim(medication_entry.value ->> 'doseUnit'), ''),
      nullif(trim(medication_entry.value ->> 'doseText'), ''), nullif(trim(medication_entry.value ->> 'frequencyCode'), ''),
      nullif(trim(medication_entry.value ->> 'frequencyText'), ''), coalesce(nullif(medication_entry.value ->> 'foodTiming', ''), 'no_preference'),
      nullif(medication_entry.value ->> 'durationValue', '')::numeric, nullif(medication_entry.value ->> 'durationUnit', ''),
      nullif(trim(medication_entry.value ->> 'durationText'), ''), nullif(trim(medication_entry.value ->> 'instructions'), ''),
      (medication_entry.ordinality - 1)::smallint
    );

    insert into public.doctor_medication_preferences (
      clinic_id, doctor_id, medication_id, usage_count, last_used_at
    ) values (v_clinic_id, v_user_id, v_medication_id, 1, now())
    on conflict (doctor_id, medication_id) do update
      set usage_count = public.doctor_medication_preferences.usage_count + 1,
          last_used_at = excluded.last_used_at,
          updated_at = now();
  end loop;

  insert into public.visit_investigations (clinic_id, visit_id, investigation, sort_order)
  select v_clinic_id, v_visit_id, trim(item.value #>> '{}'), (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_investigations, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(item.value #>> '{}'), '') is not null;

  insert into public.visit_advice (clinic_id, visit_id, advice, sort_order)
  select v_clinic_id, v_visit_id, trim(item.value #>> '{}'), (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_advice, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(item.value #>> '{}'), '') is not null;

  insert into public.doctor_advice_snippets (clinic_id, doctor_id, advice, usage_count, last_used_at)
  select v_clinic_id, v_user_id, trim(item.value #>> '{}'), 1, now()
  from jsonb_array_elements(coalesce(p_advice, '[]'::jsonb)) as item(value)
  where nullif(trim(item.value #>> '{}'), '') is not null
  on conflict (doctor_id, advice) do update
    set usage_count = public.doctor_advice_snippets.usage_count + 1,
        last_used_at = excluded.last_used_at;

  return v_visit_id;
end;
$$;

revoke all on function public.create_consultation(uuid, timestamptz, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_consultation(uuid, timestamptz, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

create function public.set_medication_favorite(p_medication_id uuid, p_is_favorite boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid := public.current_clinic_id();
  v_user_id uuid := auth.uid();
begin
  if not exists (select 1 from public.medications where id = p_medication_id and clinic_id = v_clinic_id) then
    raise exception 'Medication is not accessible' using errcode = '42501';
  end if;
  insert into public.doctor_medication_preferences (clinic_id, doctor_id, medication_id, is_favorite)
  values (v_clinic_id, v_user_id, p_medication_id, p_is_favorite)
  on conflict (doctor_id, medication_id) do update
    set is_favorite = excluded.is_favorite, updated_at = now();
end;
$$;

revoke all on function public.set_medication_favorite(uuid, boolean) from public;
grant execute on function public.set_medication_favorite(uuid, boolean) to authenticated;

create function public.save_prescription_template(
  p_name text,
  p_medications jsonb,
  p_investigations jsonb,
  p_advice jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid := public.current_clinic_id();
  v_user_id uuid := auth.uid();
  v_template_id uuid;
begin
  if v_clinic_id is null or v_user_id is null then
    raise exception 'Clinic membership is required' using errcode = '42501';
  end if;
  insert into public.prescription_templates (clinic_id, doctor_id, name)
  values (v_clinic_id, v_user_id, trim(p_name)) returning id into v_template_id;

  insert into public.prescription_template_items (
    clinic_id, template_id, doctor_id, medication_id, brand_name, generic_name, formulation, strength,
    dose_value, dose_unit, dose_text, frequency_code, frequency_text, food_timing,
    duration_value, duration_unit, duration_text, instructions, sort_order
  )
  select v_clinic_id, v_template_id, v_user_id, nullif(item.value ->> 'medicationId', '')::uuid,
    nullif(trim(item.value ->> 'brandName'), ''), nullif(trim(item.value ->> 'genericName'), ''),
    nullif(trim(item.value ->> 'formulation'), ''), nullif(trim(item.value ->> 'strength'), ''),
    nullif(item.value ->> 'doseValue', '')::numeric, nullif(trim(item.value ->> 'doseUnit'), ''),
    nullif(trim(item.value ->> 'doseText'), ''), nullif(trim(item.value ->> 'frequencyCode'), ''),
    nullif(trim(item.value ->> 'frequencyText'), ''), coalesce(nullif(item.value ->> 'foodTiming', ''), 'no_preference'),
    nullif(item.value ->> 'durationValue', '')::numeric, nullif(item.value ->> 'durationUnit', ''),
    nullif(trim(item.value ->> 'durationText'), ''), nullif(trim(item.value ->> 'instructions'), ''),
    (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_medications, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(coalesce(item.value ->> 'brandName', item.value ->> 'genericName')), '') is not null;

  insert into public.prescription_template_investigations (clinic_id, template_id, doctor_id, investigation, sort_order)
  select v_clinic_id, v_template_id, v_user_id, trim(item.value #>> '{}'), (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_investigations, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(item.value #>> '{}'), '') is not null;

  insert into public.prescription_template_advice (clinic_id, template_id, doctor_id, advice, sort_order)
  select v_clinic_id, v_template_id, v_user_id, trim(item.value #>> '{}'), (item.ordinality - 1)::smallint
  from jsonb_array_elements(coalesce(p_advice, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where nullif(trim(item.value #>> '{}'), '') is not null;
  return v_template_id;
end;
$$;

revoke all on function public.save_prescription_template(text, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_prescription_template(text, jsonb, jsonb, jsonb) to authenticated;
