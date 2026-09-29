-- Phase 4: clinic operations, role-aware access, secure documents, and reporting foundations.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner', 'admin', 'doctor', 'reception', 'staff'));

alter table public.patients
  add column if not exists blood_group text check (blood_group is null or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  add column if not exists chronic_conditions text[] not null default '{}',
  add column if not exists high_risk_notes text check (high_risk_notes is null or char_length(high_risk_notes) <= 2000);

alter table public.medications
  add column if not exists manufacturer text,
  add column if not exists is_active boolean not null default true;

alter table public.prescription_templates
  add column if not exists is_shared boolean not null default false,
  add column if not exists usage_count integer not null default 0 check (usage_count >= 0),
  add column if not exists last_used_at timestamptz;

create or replace function public.current_user_has_role(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = any(p_roles)
  );
$$;

revoke all on function public.current_user_has_role(text[]) from public, anon;
grant execute on function public.current_user_has_role(text[]) to authenticated;

-- Keep the established function name so prior policies and RPCs remain valid.
create or replace function public.current_user_is_doctor()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_user_has_role(array['owner', 'admin', 'doctor']);
$$;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null,
  clinician_id uuid,
  starts_at timestamptz not null,
  duration_minutes integer not null default 15 check (duration_minutes between 5 and 240),
  visit_type text not null default 'consultation' check (visit_type in ('consultation', 'follow_up', 'vaccination', 'procedure', 'other')),
  status text not null default 'scheduled' check (status in ('scheduled', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show')),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_patient_in_clinic_fk foreign key (patient_id, clinic_id) references public.patients(id, clinic_id) on delete restrict,
  constraint appointments_clinician_in_clinic_fk foreign key (clinician_id, clinic_id) references public.profiles(id, clinic_id) on delete restrict,
  constraint appointments_creator_in_clinic_fk foreign key (created_by, clinic_id) references public.profiles(id, clinic_id) on delete restrict,
  unique (id, clinic_id)
);

create table public.patient_vaccinations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null,
  vaccine_name text not null check (char_length(trim(vaccine_name)) between 1 and 160),
  dose_label text,
  status text not null default 'due' check (status in ('due', 'given', 'overdue', 'skipped')),
  due_date date,
  administered_at timestamptz,
  batch_number text,
  administered_by uuid,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_vaccinations_patient_in_clinic_fk foreign key (patient_id, clinic_id) references public.patients(id, clinic_id) on delete restrict,
  constraint patient_vaccinations_admin_in_clinic_fk foreign key (administered_by, clinic_id) references public.profiles(id, clinic_id) on delete restrict,
  constraint patient_vaccinations_creator_in_clinic_fk foreign key (created_by, clinic_id) references public.profiles(id, clinic_id) on delete restrict,
  unique (id, clinic_id)
);

create table public.patient_investigations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null,
  visit_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 200),
  status text not null default 'ordered' check (status in ('ordered', 'sample_collected', 'result_received', 'reviewed', 'cancelled')),
  ordered_at timestamptz not null default now(),
  result_summary text check (result_summary is null or char_length(result_summary) <= 5000),
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_investigations_patient_in_clinic_fk foreign key (patient_id, clinic_id) references public.patients(id, clinic_id) on delete restrict,
  constraint patient_investigations_visit_in_clinic_fk foreign key (visit_id, clinic_id) references public.visits(id, clinic_id) on delete restrict,
  constraint patient_investigations_reviewer_in_clinic_fk foreign key (reviewed_by, clinic_id) references public.profiles(id, clinic_id) on delete restrict,
  constraint patient_investigations_creator_in_clinic_fk foreign key (created_by, clinic_id) references public.profiles(id, clinic_id) on delete restrict,
  unique (id, clinic_id)
);

create table public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null,
  investigation_id uuid,
  category text not null default 'other' check (category in ('lab_report', 'imaging', 'referral', 'consent', 'prescription', 'other')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  storage_path text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid not null,
  created_at timestamptz not null default now(),
  constraint patient_documents_patient_in_clinic_fk foreign key (patient_id, clinic_id) references public.patients(id, clinic_id) on delete restrict,
  constraint patient_documents_investigation_in_clinic_fk foreign key (investigation_id, clinic_id) references public.patient_investigations(id, clinic_id) on delete restrict,
  constraint patient_documents_uploader_in_clinic_fk foreign key (uploaded_by, clinic_id) references public.profiles(id, clinic_id) on delete restrict,
  unique (id, clinic_id),
  unique (clinic_id, storage_path)
);

create table public.patient_growth_measurements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null,
  visit_id uuid,
  measured_at timestamptz not null default now(),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg between 0.1 and 500),
  height_cm numeric(6,2) check (height_cm is null or height_cm between 10 and 250),
  head_circumference_cm numeric(5,2) check (head_circumference_cm is null or head_circumference_cm between 10 and 100),
  bmi numeric(6,2) generated always as (case when height_cm > 0 and weight_kg is not null then round(weight_kg / power(height_cm / 100, 2), 2) end) stored,
  notes text check (notes is null or char_length(notes) <= 2000),
  recorded_by uuid not null,
  created_at timestamptz not null default now(),
  constraint patient_growth_patient_in_clinic_fk foreign key (patient_id, clinic_id) references public.patients(id, clinic_id) on delete restrict,
  constraint patient_growth_visit_in_clinic_fk foreign key (visit_id, clinic_id) references public.visits(id, clinic_id) on delete restrict,
  constraint patient_growth_recorder_in_clinic_fk foreign key (recorded_by, clinic_id) references public.profiles(id, clinic_id) on delete restrict,
  check (weight_kg is not null or height_cm is not null or head_circumference_cm is not null),
  unique (id, clinic_id)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null,
  invoice_number text not null,
  issued_at timestamptz not null default now(),
  status text not null default 'unpaid' check (status in ('draft', 'unpaid', 'part_paid', 'paid', 'void')),
  payment_method text check (payment_method is null or payment_method in ('cash', 'card', 'upi', 'bank_transfer', 'other')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) generated always as (greatest(subtotal - discount, 0)) stored,
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_patient_in_clinic_fk foreign key (patient_id, clinic_id) references public.patients(id, clinic_id) on delete restrict,
  constraint invoices_creator_in_clinic_fk foreign key (created_by, clinic_id) references public.profiles(id, clinic_id) on delete restrict,
  constraint invoices_clinic_number_key unique (clinic_id, invoice_number),
  unique (id, clinic_id)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  invoice_id uuid not null,
  description text not null check (char_length(trim(description)) between 1 and 300),
  quantity numeric(8,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order integer not null default 0 check (sort_order >= 0),
  constraint invoice_items_invoice_in_clinic_fk foreign key (invoice_id, clinic_id) references public.invoices(id, clinic_id) on delete cascade
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  actor_id uuid not null,
  action text not null check (char_length(action) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  occurred_at timestamptz not null default now(),
  constraint audit_events_actor_in_clinic_fk foreign key (actor_id, clinic_id) references public.profiles(id, clinic_id) on delete restrict
);

create index appointments_clinic_date_idx on public.appointments(clinic_id, starts_at, status);
create index vaccinations_patient_due_idx on public.patient_vaccinations(clinic_id, patient_id, due_date);
create index investigations_patient_date_idx on public.patient_investigations(clinic_id, patient_id, ordered_at desc);
create index documents_patient_date_idx on public.patient_documents(clinic_id, patient_id, created_at desc);
create index growth_patient_date_idx on public.patient_growth_measurements(clinic_id, patient_id, measured_at desc);
create index invoices_patient_date_idx on public.invoices(clinic_id, patient_id, issued_at desc);
create index audit_events_clinic_date_idx on public.audit_events(clinic_id, occurred_at desc);

create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger vaccinations_set_updated_at before update on public.patient_vaccinations for each row execute function public.set_updated_at();
create trigger investigations_set_updated_at before update on public.patient_investigations for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices for each row execute function public.set_updated_at();

alter table public.appointments enable row level security;
alter table public.patient_vaccinations enable row level security;
alter table public.patient_investigations enable row level security;
alter table public.patient_documents enable row level security;
alter table public.patient_growth_measurements enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.audit_events enable row level security;

alter table public.appointments force row level security;
alter table public.patient_vaccinations force row level security;
alter table public.patient_investigations force row level security;
alter table public.patient_documents force row level security;
alter table public.patient_growth_measurements force row level security;
alter table public.invoices force row level security;
alter table public.invoice_items force row level security;
alter table public.audit_events force row level security;

create policy appointments_select_own_clinic on public.appointments for select to authenticated using (clinic_id = public.current_clinic_id());
create policy appointments_insert_own_clinic on public.appointments for insert to authenticated
  with check (clinic_id = public.current_clinic_id() and created_by = auth.uid() and public.current_user_has_role(array['owner','admin','doctor','reception','staff']));
create policy appointments_update_own_clinic on public.appointments for update to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_has_role(array['owner','admin','doctor','reception','staff']))
  with check (clinic_id = public.current_clinic_id() and public.current_user_has_role(array['owner','admin','doctor','reception','staff']));
create policy appointments_delete_own_clinic on public.appointments for delete to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_has_role(array['owner','admin','doctor','reception','staff']));

create policy vaccinations_select_own_clinic on public.patient_vaccinations for select to authenticated using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy vaccinations_insert_clinical on public.patient_vaccinations for insert to authenticated
  with check (clinic_id = public.current_clinic_id() and created_by = auth.uid() and public.current_user_is_doctor());
create policy vaccinations_update_clinical on public.patient_vaccinations for update to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor())
  with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy vaccinations_delete_clinical on public.patient_vaccinations for delete to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

create policy investigations_select_own_clinic on public.patient_investigations for select to authenticated using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy investigations_insert_clinical on public.patient_investigations for insert to authenticated
  with check (clinic_id = public.current_clinic_id() and created_by = auth.uid() and public.current_user_is_doctor());
create policy investigations_update_clinical on public.patient_investigations for update to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor())
  with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy investigations_delete_clinical on public.patient_investigations for delete to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

create policy documents_select_own_clinic on public.patient_documents for select to authenticated using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy documents_insert_clinical on public.patient_documents for insert to authenticated
  with check (clinic_id = public.current_clinic_id() and uploaded_by = auth.uid() and public.current_user_is_doctor());
create policy documents_delete_clinical on public.patient_documents for delete to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

create policy growth_select_own_clinic on public.patient_growth_measurements for select to authenticated using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy growth_insert_clinical on public.patient_growth_measurements for insert to authenticated
  with check (clinic_id = public.current_clinic_id() and recorded_by = auth.uid() and public.current_user_is_doctor());
create policy growth_update_clinical on public.patient_growth_measurements for update to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor())
  with check (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());
create policy growth_delete_clinical on public.patient_growth_measurements for delete to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_is_doctor());

create policy invoices_select_own_clinic on public.invoices for select to authenticated using (clinic_id = public.current_clinic_id());
create policy invoices_insert_authorized on public.invoices for insert to authenticated
  with check (clinic_id = public.current_clinic_id() and created_by = auth.uid() and public.current_user_has_role(array['owner','admin','reception','staff']));
create policy invoices_update_authorized on public.invoices for update to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_has_role(array['owner','admin','reception','staff']))
  with check (clinic_id = public.current_clinic_id() and public.current_user_has_role(array['owner','admin','reception','staff']));
create policy invoices_delete_authorized on public.invoices for delete to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_has_role(array['owner','admin']));
create policy invoice_items_select_own_clinic on public.invoice_items for select to authenticated using (clinic_id = public.current_clinic_id());
create policy invoice_items_write_authorized on public.invoice_items for all to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_has_role(array['owner','admin','reception','staff']))
  with check (clinic_id = public.current_clinic_id() and public.current_user_has_role(array['owner','admin','reception','staff']));

create policy audit_events_admin_select on public.audit_events for select to authenticated
  using (clinic_id = public.current_clinic_id() and public.current_user_has_role(array['owner','admin']));
create policy audit_events_insert_own_clinic on public.audit_events for insert to authenticated
  with check (clinic_id = public.current_clinic_id() and actor_id = auth.uid());

revoke all on public.appointments, public.patient_vaccinations, public.patient_investigations,
  public.patient_documents, public.patient_growth_measurements, public.invoices, public.invoice_items,
  public.audit_events from anon, authenticated;
grant select on public.appointments, public.patient_vaccinations, public.patient_investigations,
  public.patient_documents, public.patient_growth_measurements, public.invoices, public.invoice_items to authenticated;
grant insert, update, delete on public.appointments, public.patient_vaccinations, public.patient_investigations,
  public.patient_documents, public.patient_growth_measurements, public.invoices, public.invoice_items to authenticated;
grant select, insert on public.audit_events to authenticated;
grant usage, select on sequence public.audit_events_id_seq to authenticated;

grant update (blood_group, chronic_conditions, high_risk_notes) on public.patients to authenticated;
grant update (manufacturer, is_active) on public.medications to authenticated;
grant update (is_shared, usage_count, last_used_at) on public.prescription_templates to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-documents', 'patient-documents', false, 10485760, array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy patient_documents_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'patient-documents' and (storage.foldername(name))[1] = 'clinic'
  and (storage.foldername(name))[2] = public.current_clinic_id()::text
  and public.current_user_is_doctor()
);
create policy patient_documents_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'patient-documents' and (storage.foldername(name))[1] = 'clinic'
  and (storage.foldername(name))[2] = public.current_clinic_id()::text
  and (storage.foldername(name))[3] = 'patients'
  and public.current_user_is_doctor()
);
create policy patient_documents_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'patient-documents' and (storage.foldername(name))[1] = 'clinic'
  and (storage.foldername(name))[2] = public.current_clinic_id()::text
  and public.current_user_is_doctor()
);

create or replace function public.record_audit_event(p_action text, p_entity_type text, p_entity_id uuid default null)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if char_length(trim(p_action)) not between 1 and 80 or char_length(trim(p_entity_type)) not between 1 and 80 then
    raise exception 'Invalid audit event';
  end if;
  insert into public.audit_events (clinic_id, actor_id, action, entity_type, entity_id)
  values (public.current_clinic_id(), auth.uid(), trim(p_action), trim(p_entity_type), p_entity_id);
end;
$$;

revoke all on function public.record_audit_event(text, text, uuid) from public, anon;
grant execute on function public.record_audit_event(text, text, uuid) to authenticated;

create or replace function public.update_staff_role(p_profile_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor public.profiles%rowtype;
  v_target public.profiles%rowtype;
begin
  select * into v_actor from public.profiles where id = auth.uid();
  select * into v_target from public.profiles where id = p_profile_id;
  if v_actor.id is null or v_target.id is null or v_actor.clinic_id <> v_target.clinic_id then
    raise exception 'Staff member is not accessible';
  end if;
  if v_actor.role not in ('owner', 'admin') then
    raise exception 'Only clinic administrators can update staff roles';
  end if;
  if p_role not in ('owner', 'admin', 'doctor', 'reception') then
    raise exception 'Invalid staff role';
  end if;
  if v_actor.role = 'admin' and (v_target.role = 'owner' or p_role = 'owner') then
    raise exception 'Only an owner can manage the owner role';
  end if;
  if v_target.id = v_actor.id and v_actor.role = 'owner' and p_role <> 'owner' then
    raise exception 'An owner cannot remove their own owner role';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_profile_id;
  insert into public.audit_events (clinic_id, actor_id, action, entity_type, entity_id)
  values (v_actor.clinic_id, v_actor.id, 'staff.role_updated', 'profile', p_profile_id);
end;
$$;

revoke all on function public.update_staff_role(uuid, text) from public, anon;
grant execute on function public.update_staff_role(uuid, text) to authenticated;
