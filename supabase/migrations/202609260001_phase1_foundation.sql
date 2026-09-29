-- Phase 1 clinical data foundation.
-- Accounts are created with Supabase Auth, then assigned to a clinic by inserting
-- a public.profiles row from a trusted server/admin environment.

create extension if not exists pgcrypto;

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  role text not null default 'staff' check (role in ('doctor', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, clinic_id)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  medical_record_number text not null check (medical_record_number ~ '^[A-Za-z0-9][A-Za-z0-9/_-]{1,31}$'),
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 80),
  date_of_birth date not null check (date_of_birth >= date '1900-01-01' and date_of_birth <= current_date),
  sex text not null check (sex in ('female', 'male', 'other', 'unknown')),
  phone text,
  email text,
  address text check (address is null or char_length(address) <= 500),
  emergency_contact_name text,
  emergency_contact_phone text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_creator_in_clinic_fk foreign key (created_by, clinic_id)
    references public.profiles(id, clinic_id) on delete restrict,
  constraint patients_clinic_mrn_key unique (clinic_id, medical_record_number),
  unique (id, clinic_id)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null,
  clinician_id uuid not null,
  visited_at timestamptz not null default now(),
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  clinical_notes text check (clinical_notes is null or char_length(clinical_notes) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_patient_in_clinic_fk foreign key (patient_id, clinic_id)
    references public.patients(id, clinic_id) on delete restrict,
  constraint visits_clinician_in_clinic_fk foreign key (clinician_id, clinic_id)
    references public.profiles(id, clinic_id) on delete restrict,
  unique (id, clinic_id)
);

create table public.vitals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  visit_id uuid not null,
  recorded_by uuid not null,
  recorded_at timestamptz not null default now(),
  systolic_bp smallint check (systolic_bp between 40 and 300),
  diastolic_bp smallint check (diastolic_bp between 20 and 200),
  pulse_bpm smallint check (pulse_bpm between 20 and 300),
  temperature_c numeric(4,1) check (temperature_c between 25 and 50),
  respiratory_rate smallint check (respiratory_rate between 3 and 100),
  oxygen_saturation numeric(4,1) check (oxygen_saturation between 0 and 100),
  weight_kg numeric(6,2) check (weight_kg > 0 and weight_kg <= 1000),
  height_cm numeric(5,2) check (height_cm > 0 and height_cm <= 300),
  constraint vitals_visit_in_clinic_fk foreign key (visit_id, clinic_id)
    references public.visits(id, clinic_id) on delete restrict,
  constraint vitals_recorder_in_clinic_fk foreign key (recorded_by, clinic_id)
    references public.profiles(id, clinic_id) on delete restrict
);

create index profiles_clinic_id_idx on public.profiles(clinic_id);
create index patients_clinic_name_idx on public.patients(clinic_id, lower(last_name), lower(first_name));
create index patients_clinic_phone_idx on public.patients(clinic_id, phone);
create index visits_patient_date_idx on public.visits(clinic_id, patient_id, visited_at desc);
create index vitals_visit_date_idx on public.vitals(clinic_id, visit_id, recorded_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clinics_set_updated_at before update on public.clinics
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger patients_set_updated_at before update on public.patients
for each row execute function public.set_updated_at();
create trigger visits_set_updated_at before update on public.visits
for each row execute function public.set_updated_at();

-- This security-definer helper reads only the caller's immutable server-managed
-- clinic membership. It avoids recursive profile RLS checks.
create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.clinic_id
  from public.profiles as p
  where p.id = auth.uid()
$$;

revoke all on function public.current_clinic_id() from public;
grant execute on function public.current_clinic_id() to authenticated;
revoke all on function public.set_updated_at() from public;

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.vitals enable row level security;

alter table public.clinics force row level security;
alter table public.profiles force row level security;
alter table public.patients force row level security;
alter table public.visits force row level security;
alter table public.vitals force row level security;

create policy clinics_select_own on public.clinics
for select to authenticated
using (id = public.current_clinic_id());

create policy profiles_select_own_clinic on public.profiles
for select to authenticated
using (clinic_id = public.current_clinic_id());

create policy patients_select_own_clinic on public.patients
for select to authenticated
using (clinic_id = public.current_clinic_id());
create policy patients_insert_own_clinic on public.patients
for insert to authenticated
with check (clinic_id = public.current_clinic_id() and created_by = auth.uid());
create policy patients_update_own_clinic on public.patients
for update to authenticated
using (clinic_id = public.current_clinic_id())
with check (clinic_id = public.current_clinic_id());

create policy visits_select_own_clinic on public.visits
for select to authenticated
using (clinic_id = public.current_clinic_id());
create policy visits_insert_own_clinic on public.visits
for insert to authenticated
with check (clinic_id = public.current_clinic_id() and clinician_id = auth.uid());
create policy visits_update_own_clinic on public.visits
for update to authenticated
using (clinic_id = public.current_clinic_id())
with check (clinic_id = public.current_clinic_id());

create policy vitals_select_own_clinic on public.vitals
for select to authenticated
using (clinic_id = public.current_clinic_id());
create policy vitals_insert_own_clinic on public.vitals
for insert to authenticated
with check (clinic_id = public.current_clinic_id() and recorded_by = auth.uid());
create policy vitals_update_own_clinic on public.vitals
for update to authenticated
using (clinic_id = public.current_clinic_id())
with check (clinic_id = public.current_clinic_id());

-- Authenticated clients receive only the operations Phase 1 needs. Clinic and
-- membership provisioning remains server/admin-only (service role or SQL editor).
revoke all on public.clinics, public.profiles, public.patients, public.visits, public.vitals from anon;
revoke all on public.clinics, public.profiles, public.patients, public.visits, public.vitals from authenticated;
grant select on public.clinics, public.profiles to authenticated;
grant select on public.patients, public.visits, public.vitals to authenticated;
grant insert (
  clinic_id, medical_record_number, first_name, last_name, date_of_birth, sex,
  phone, email, address, emergency_contact_name, emergency_contact_phone, created_by
) on public.patients to authenticated;
grant insert (
  clinic_id, patient_id, clinician_id, visited_at, reason, clinical_notes
) on public.visits to authenticated;
grant insert (
  clinic_id, visit_id, recorded_by, recorded_at, systolic_bp, diastolic_bp,
  pulse_bpm, temperature_c, respiratory_rate, oxygen_saturation, weight_kg, height_cm
) on public.vitals to authenticated;
grant update (
  medical_record_number, first_name, last_name, date_of_birth, sex, phone, email,
  address, emergency_contact_name, emergency_contact_phone
) on public.patients to authenticated;
grant update (visited_at, reason, clinical_notes) on public.visits to authenticated;
grant update (
  recorded_at, systolic_bp, diastolic_bp, pulse_bpm, temperature_c,
  respiratory_rate, oxygen_saturation, weight_kg, height_cm
) on public.vitals to authenticated;
