# Repository Guidelines


# Project: Doctor Clinic EMR

This is a private medical clinic application.

Tech stack:
- React
- TypeScript
- Vite
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Vercel

Primary goals:
- Extremely fast doctor workflow
- Tablet-first interface
- Minimal typing
- Strong patient-data security
- Printable prescriptions

Security requirements:
- Never expose Supabase service-role keys to the frontend.
- Never disable Row Level Security to make something work.
- All patient-related tables must use RLS.
- Never log patient medical data.
- Never put real patient information into tests or sample data.
- Do not store sensitive patient information in localStorage.
- All database migrations must be committed to the repository.
- Authentication and authorization must be enforced server-side/database-side,
  not only through UI checks.

Architecture:
- Store medical records as structured database records.
- PDFs are generated outputs, not the source of truth.
- Keep patient, visit, prescription, and medication data normalized.
- Keep UI components modular.

Development rules:
- TypeScript strict mode.
- Run linting and tests after meaningful changes.
- Fix TypeScript errors before finishing.
- Avoid unnecessary dependencies.
- Explain database migrations and security changes.

## Project Structure & Module Organization

This repository is a React 19 application built with TypeScript and Vite. Application code lives in `src/`: `main.tsx` mounts the app, `App.tsx` contains the root component, and adjacent `.css` files provide global and component styles. Imported images belong in `src/assets/`; files that must be served unchanged, such as `favicon.svg` and `icons.svg`, belong in `public/`. Build and tooling configuration is kept at the root in `vite.config.ts`, `eslint.config.js`, and the `tsconfig*.json` files. Vite writes production output to `dist/`; do not commit it.

## Build, Test, and Development Commands

- `npm install` installs the exact dependency versions recorded in `package-lock.json`.
- `npm run dev` starts the Vite development server with hot module replacement.
- `npm run build` runs TypeScript project checks and creates the production bundle in `dist/`.
- `npm run lint` checks all TypeScript and TSX files with ESLint, including React Hooks and Fast Refresh rules.
- `npm run preview` serves the built bundle locally for final verification.

Run `npm run lint` and `npm run build` before opening a pull request.

## Coding Style & Naming Conventions

Follow the existing style: two-space indentation, single quotes, no semicolons, and trailing commas in multiline expressions. Use PascalCase for React components (`AppointmentCard.tsx`), camelCase for functions and variables, and lowercase kebab-case for static asset names. Keep component-specific styles beside their component when practical. Prefer functional components and hooks, provide meaningful image `alt` text, and keep TypeScript free of unused variables or parameters; the compiler enforces both.

## Testing Guidelines

No automated test framework or coverage threshold is configured yet. Until one is added, treat linting, a production build, and a browser smoke test as the required validation. For UI changes, verify the affected interaction in `npm run dev` and check both narrow and desktop viewport layouts. When adding tests, use `*.test.ts` or `*.test.tsx` beside the code under test and add the corresponding `npm test` script to `package.json`.

## Commit & Pull Request Guidelines

Git history is not included in this workspace, so use concise, imperative commit subjects such as `Add appointment booking form`. Keep each commit focused. Pull requests should explain the user-visible change, list validation performed, link relevant issues, and include before/after screenshots for visual updates. Call out new dependencies or configuration changes explicitly.
