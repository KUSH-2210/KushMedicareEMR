-- Phase 3B: prescription presentation, private clinic assets, numbering, and
-- explicit doctor-only access to clinical records.

alter table public.clinics
  add column prescription_name text check (prescription_name is null or char_length(trim(prescription_name)) between 2 and 160),
  add column prescription_email text check (prescription_email is null or char_length(trim(prescription_email)) <= 254),
  add column logo_path text check (logo_path is null or char_length(logo_path) <= 500),
  add column default_paper_size text not null default 'A4' check (default_paper_size in ('A4', 'A5')),
  add column prescription_footer text check (prescription_footer is null or char_length(prescription_footer) <= 1000);

alter table public.profiles
  add column display_name text check (display_name is null or char_length(trim(display_name)) between 2 and 160),
  add column qualification text check (qualification is null or char_length(trim(qualification)) <= 200),
  add column specialization text check (specialization is null or char_length(trim(specialization)) <= 200),
  add column medical_registration_number text check (medical_registration_number is null or char_length(trim(medical_registration_number)) <= 100),
  add column additional_credentials text check (additional_credentials is null or char_length(trim(additional_credentials)) <= 500),
  add column signature_path text check (signature_path is null or char_length(signature_path) <= 500);

create unique index profiles_clinic_registration_number_key
  on public.profiles(clinic_id, lower(medical_registration_number))
  where medical_registration_number is not null;

alter table public.visits
  add column prescription_number text check (prescription_number is null or prescription_number ~ '^RX-[0-9]{4}-[0-9]{6,}$');

create unique index visits_clinic_prescription_number_key
  on public.visits(clinic_id, prescription_number)
  where prescription_number is not null;

create table public.clinic_prescription_counters (
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  calendar_year smallint not null check (calendar_year between 2000 and 9999),
  last_value bigint not null default 0 check (last_value >= 0),
  primary key (clinic_id, calendar_year)
);

alter table public.clinic_prescription_counters enable row level security;
alter table public.clinic_prescription_counters force row level security;

-- Security-definer is intentionally limited to returning a boolean derived
-- from the caller's server-managed profile. It avoids recursive profile RLS.
create or replace function public.current_user_is_doctor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'doctor'
  )
$$;

revoke all on function public.current_user_is_doctor() from public;
grant execute on function public.current_user_is_doctor() to authenticated;

create policy clinic_prescription_counters_doctor_select on public.clinic_prescription_counters
for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy clinic_prescription_counters_doctor_insert on public.clinic_prescription_counters
for insert to authenticated
with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy clinic_prescription_counters_doctor_update on public.clinic_prescription_counters
for update to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor())
with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

revoke all on public.clinic_prescription_counters from anon, authenticated;
grant select on public.clinic_prescription_counters to authenticated;
grant insert (clinic_id, calendar_year, last_value) on public.clinic_prescription_counters to authenticated;
grant update (last_value) on public.clinic_prescription_counters to authenticated;

create or replace function public.assign_visit_prescription_number()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_year smallint;
  v_value bigint;
begin
  if auth.uid() is not null and not public.current_user_is_doctor() then
    raise exception 'Only doctors can create consultations' using errcode = '42501';
  end if;

  if new.prescription_number is null then
    v_year := extract(year from coalesce(new.visited_at, now()))::smallint;
    insert into public.clinic_prescription_counters (clinic_id, calendar_year, last_value)
    values (new.clinic_id, v_year, 1)
    on conflict (clinic_id, calendar_year) do update
      set last_value = public.clinic_prescription_counters.last_value + 1
    returning last_value into v_value;
    new.prescription_number := 'RX-' || v_year::text || '-' || lpad(v_value::text, 6, '0');
  end if;
  return new;
end;
$$;

revoke all on function public.assign_visit_prescription_number() from public;
create trigger visits_assign_prescription_number
before insert on public.visits
for each row execute function public.assign_visit_prescription_number();

-- Clinic and doctor prescription settings are doctor-managed. Membership and
-- role columns remain unavailable to browser updates.
create policy clinics_update_prescription_settings_doctor on public.clinics
for update to authenticated
using (id = public.current_clinic_id() and public.current_user_is_doctor())
with check (id = public.current_clinic_id() and public.current_user_is_doctor());

create policy profiles_update_own_prescription_settings_doctor on public.profiles
for update to authenticated
using (id = auth.uid() and clinic_id = public.current_clinic_id() and public.current_user_is_doctor())
with check (id = auth.uid() and clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

grant update (prescription_name, address, phone, prescription_email, logo_path, default_paper_size, prescription_footer)
  on public.clinics to authenticated;
grant update (display_name, qualification, specialization, medical_registration_number, additional_credentials, signature_path)
  on public.profiles to authenticated;

-- Existing Phase 1-3 clinical policies were clinic-scoped but did not
-- distinguish doctors from staff. Replace them without altering patient
-- demographic access.
drop policy visits_select_own_clinic on public.visits;
drop policy visits_insert_own_clinic on public.visits;
drop policy visits_update_own_clinic on public.visits;
create policy visits_doctor_select_own_clinic on public.visits for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy visits_doctor_insert_own_clinic on public.visits for insert to authenticated
with check (clinic_id = public.current_clinic_id() and clinician_id = auth.uid() and public.current_user_is_doctor());
create policy visits_doctor_update_own_clinic on public.visits for update to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor())
with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

drop policy vitals_select_own_clinic on public.vitals;
drop policy vitals_insert_own_clinic on public.vitals;
drop policy vitals_update_own_clinic on public.vitals;
create policy vitals_doctor_select_own_clinic on public.vitals for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy vitals_doctor_insert_own_clinic on public.vitals for insert to authenticated
with check (clinic_id = public.current_clinic_id() and recorded_by = auth.uid() and public.current_user_is_doctor());
create policy vitals_doctor_update_own_clinic on public.vitals for update to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor())
with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

drop policy patient_allergies_select_own_clinic on public.patient_allergies;
create policy patient_allergies_doctor_select_own_clinic on public.patient_allergies for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

drop policy visit_complaints_select_own_clinic on public.visit_complaints;
drop policy visit_complaints_insert_own_clinic on public.visit_complaints;
create policy visit_complaints_doctor_select on public.visit_complaints for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy visit_complaints_doctor_insert on public.visit_complaints for insert to authenticated
with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

drop policy examination_findings_select_own_clinic on public.examination_findings;
drop policy examination_findings_insert_own_clinic on public.examination_findings;
create policy examination_findings_doctor_select on public.examination_findings for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy examination_findings_doctor_insert on public.examination_findings for insert to authenticated
with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

drop policy visit_diagnoses_select_own_clinic on public.visit_diagnoses;
drop policy visit_diagnoses_insert_own_clinic on public.visit_diagnoses;
create policy visit_diagnoses_doctor_select on public.visit_diagnoses for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy visit_diagnoses_doctor_insert on public.visit_diagnoses for insert to authenticated
with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

drop policy visit_investigations_select_own_clinic on public.visit_investigations;
drop policy visit_investigations_insert_own_clinic on public.visit_investigations;
create policy visit_investigations_doctor_select on public.visit_investigations for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy visit_investigations_doctor_insert on public.visit_investigations for insert to authenticated
with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

drop policy visit_advice_select_own_clinic on public.visit_advice;
drop policy visit_advice_insert_own_clinic on public.visit_advice;
create policy visit_advice_doctor_select on public.visit_advice for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy visit_advice_doctor_insert on public.visit_advice for insert to authenticated
with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

drop policy medications_select_own_clinic on public.medications;
drop policy medications_insert_own_clinic on public.medications;
create policy medications_doctor_select on public.medications for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy medications_doctor_insert on public.medications for insert to authenticated
with check (clinic_id = public.current_clinic_id() and created_by = auth.uid() and public.current_user_is_doctor());

drop policy prescription_items_select_own_clinic on public.prescription_items;
drop policy prescription_items_insert_own_clinic on public.prescription_items;
create policy prescription_items_doctor_select on public.prescription_items for select to authenticated
using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy prescription_items_doctor_insert on public.prescription_items for insert to authenticated
with check (clinic_id = public.current_clinic_id() and prescribed_by = auth.uid() and public.current_user_is_doctor());

drop policy doctor_medication_preferences_select_own on public.doctor_medication_preferences;
drop policy doctor_medication_preferences_insert_own on public.doctor_medication_preferences;
drop policy doctor_medication_preferences_update_own on public.doctor_medication_preferences;
create policy doctor_medication_preferences_doctor_select on public.doctor_medication_preferences for select to authenticated
using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());
create policy doctor_medication_preferences_doctor_insert on public.doctor_medication_preferences for insert to authenticated
with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());
create policy doctor_medication_preferences_doctor_update on public.doctor_medication_preferences for update to authenticated
using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor())
with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());

drop policy prescription_templates_select_own on public.prescription_templates;
drop policy prescription_templates_insert_own on public.prescription_templates;
create policy prescription_templates_doctor_select on public.prescription_templates for select to authenticated
using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());
create policy prescription_templates_doctor_insert on public.prescription_templates for insert to authenticated
with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());

drop policy prescription_template_items_select_own on public.prescription_template_items;
drop policy prescription_template_items_insert_own on public.prescription_template_items;
create policy prescription_template_items_doctor_select on public.prescription_template_items for select to authenticated
using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());
create policy prescription_template_items_doctor_insert on public.prescription_template_items for insert to authenticated
with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());

drop policy prescription_template_investigations_select_own on public.prescription_template_investigations;
drop policy prescription_template_investigations_insert_own on public.prescription_template_investigations;
create policy prescription_template_investigations_doctor_select on public.prescription_template_investigations for select to authenticated
using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());
create policy prescription_template_investigations_doctor_insert on public.prescription_template_investigations for insert to authenticated
with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());

drop policy prescription_template_advice_select_own on public.prescription_template_advice;
drop policy prescription_template_advice_insert_own on public.prescription_template_advice;
create policy prescription_template_advice_doctor_select on public.prescription_template_advice for select to authenticated
using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());
create policy prescription_template_advice_doctor_insert on public.prescription_template_advice for insert to authenticated
with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());

drop policy doctor_advice_snippets_select_own on public.doctor_advice_snippets;
drop policy doctor_advice_snippets_insert_own on public.doctor_advice_snippets;
drop policy doctor_advice_snippets_update_own on public.doctor_advice_snippets;
create policy doctor_advice_snippets_doctor_select on public.doctor_advice_snippets for select to authenticated
using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());
create policy doctor_advice_snippets_doctor_insert on public.doctor_advice_snippets for insert to authenticated
with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());
create policy doctor_advice_snippets_doctor_update on public.doctor_advice_snippets for update to authenticated
using (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor())
with check (clinic_id = public.current_clinic_id() and doctor_id = auth.uid() and public.current_user_is_doctor());

-- Private object storage. Object paths are scoped as:
-- clinic/<clinic-id>/logo/<file>
-- clinic/<clinic-id>/doctors/<doctor-id>/signature/<file>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clinic-assets', 'clinic-assets', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy clinic_assets_doctor_read on storage.objects for select to authenticated
using (
  bucket_id = 'clinic-assets'
  and public.current_user_is_doctor()
  and (storage.foldername(name))[1] = 'clinic'
  and (storage.foldername(name))[2] = public.current_clinic_id()::text
);

create policy clinic_assets_doctor_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'clinic-assets'
  and public.current_user_is_doctor()
  and (storage.foldername(name))[1] = 'clinic'
  and (storage.foldername(name))[2] = public.current_clinic_id()::text
  and (
    (storage.foldername(name))[3] = 'logo'
    or (
      (storage.foldername(name))[3] = 'doctors'
      and (storage.foldername(name))[4] = auth.uid()::text
      and (storage.foldername(name))[5] = 'signature'
    )
  )
);

create policy clinic_assets_doctor_update on storage.objects for update to authenticated
using (
  bucket_id = 'clinic-assets'
  and public.current_user_is_doctor()
  and (storage.foldername(name))[1] = 'clinic'
  and (storage.foldername(name))[2] = public.current_clinic_id()::text
  and (
    (storage.foldername(name))[3] = 'logo'
    or (
      (storage.foldername(name))[3] = 'doctors'
      and (storage.foldername(name))[4] = auth.uid()::text
      and (storage.foldername(name))[5] = 'signature'
    )
  )
)
with check (
  bucket_id = 'clinic-assets'
  and public.current_user_is_doctor()
  and (storage.foldername(name))[1] = 'clinic'
  and (storage.foldername(name))[2] = public.current_clinic_id()::text
  and (
    (storage.foldername(name))[3] = 'logo'
    or (
      (storage.foldername(name))[3] = 'doctors'
      and (storage.foldername(name))[4] = auth.uid()::text
      and (storage.foldername(name))[5] = 'signature'
    )
  )
);

create policy clinic_assets_doctor_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'clinic-assets'
  and public.current_user_is_doctor()
  and (storage.foldername(name))[1] = 'clinic'
  and (storage.foldername(name))[2] = public.current_clinic_id()::text
  and (
    (storage.foldername(name))[3] = 'logo'
    or (
      (storage.foldername(name))[3] = 'doctors'
      and (storage.foldername(name))[4] = auth.uid()::text
      and (storage.foldername(name))[5] = 'signature'
    )
  )
);
