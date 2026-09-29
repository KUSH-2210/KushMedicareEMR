# Kush Medicare ClinicOS

A private, tablet-first EMR for Kush Medicare. The application supports patient registration, consultations, printable prescriptions, appointments, vaccinations, investigations, growth records, secure documents, billing, medicine catalogs, prescription templates, reporting, and role-based clinic operations.

## Local setup

1. Create a Supabase project.
2. Run the migrations in filename order:

   - `supabase/migrations/202609260001_phase1_foundation.sql`
   - `supabase/migrations/202609260002_consultations.sql`
   - `supabase/migrations/202609260003_prescriptions.sql`
   - `supabase/migrations/202609260004_printing_settings.sql`
   - `supabase/migrations/202609290005_phase4_clinic_portal.sql`

3. Copy `.env.example` to `.env.local` and set:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
   ```

   Use the HTTPS Project URL from Supabase Settings > API. Only a publishable or anonymous key belongs in the browser. Never put a database password, `sb_secret_`, or service-role secret in a `VITE_` variable.

4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

## Provision the first clinic account

Public signup is intentionally unavailable. Create the user in Supabase Authentication, create a clinic, then link the user from the trusted SQL editor:

```sql
insert into public.clinics (name)
values ('Kush Medicare')
returning id;

insert into public.profiles (id, clinic_id, full_name, role)
values (
  '<supabase-auth-user-id>',
  '<clinic-id-returned-above>',
  'Doctor name',
  'owner'
);
```

Create further accounts through a trusted Supabase administration flow, then assign each account a clinic profile. Disable public email signup for this private application.

## Security model

- Supabase Auth handles sessions and password authentication.
- `profiles.clinic_id` is the database-controlled source of clinic membership.
- Patient-related tables use clinic-scoped foreign keys and forced Row Level Security.
- Owners, administrators, and doctors can access clinical records. Reception and staff access is limited by database policy.
- Consultation saving remains a security-invoker database transaction and does not accept a browser-controlled clinic ID.
- Clinic assets and patient documents use private storage buckets with clinic-scoped policies.
- Signed asset URLs are short-lived and are never logged.
- Audit events store minimal operational metadata and exclude medical record contents.
- Prescription numbers are generated atomically per clinic and calendar year.
- PDFs are generated outputs; structured database records remain the source of truth.
- The frontend never receives a service-role key and does not store medical data in local storage.

## Commands

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## Structure

- `src/app` - routing
- `src/components` - shared shell and UI primitives
- `src/features/auth` - session, profile, and clinic authorization
- `src/features/patients` - patient data access and validation
- `src/features/consultations` - normalized clinical records and consultation UI
- `src/features/prescriptions` - printable prescription rendering
- `src/features/portal` - appointments, vaccinations, investigations, documents, growth, and billing
- `src/pages` - route-level screens
- `src/lib` - Supabase client, database types, and shared helpers
- `supabase/migrations` - versioned PostgreSQL schema and RLS policies

For production, configure the deployment platform with the same two public environment variables, restrict Supabase Auth redirect URLs to approved origins, and keep privileged workflows in trusted server or database functions.
