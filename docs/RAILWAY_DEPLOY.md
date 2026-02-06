# Railway Deployment Guide

This doc describes how to deploy Brickly on Railway, including environment setup, database configuration, and operational checks.

## 1) Create the Railway project

- Create a new Railway project.
- Connect the GitHub repo.
- Configure build and start commands:
  - Build: `npm run build`
  - Start: `npm run start`
- Ensure the Node.js version matches local dev expectations.

## 2) Environment variables

Set the same environment variables currently used in Vercel.

**Required**:

- `REBRICKABLE_API_KEY`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_SECRET`
- `AUTH_URL`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `PRISMA_DATABASE_URL`

**Optional**:

- `AUTH_TRUST_HOST=true`
- `NEXTAUTH_DEBUG=true`
- `NEXT_PUBLIC_DEBUG_UI=true`
- `NEXT_PUBLIC_DEBUG_CLIENT=true`
- `DEBUG_API=true`
- `DEBUG_DB=true`

Notes:
- `AUTH_URL` and `NEXTAUTH_URL` must match the Railway domain.
- Set `AUTH_TRUST_HOST=true` if local or reverse-proxy routing causes host header issues.

## 3) Database setup

Option A: Railway Postgres

- Add the Railway Postgres plugin.
- Use the provided connection string for `DATABASE_URL`.
- If using Prisma Accelerate, set `PRISMA_DATABASE_URL` accordingly.

Option B: External Postgres

- Use your existing managed database and set both URLs.

## 4) Migrations

- Run `npx prisma migrate deploy` during deploy.
- Ensure `DATABASE_URL` is set and reachable.

## 5) OAuth redirect URIs

Update Google OAuth redirect URIs to include:

- `https://<railway-domain>/api/auth/callback/google`

## 6) PWA + static assets

Validate:

- `/manifest.json` returns 200
- Service worker registers without errors
- App icons load properly

## 7) Verification checklist

- Visit `/api/health`
- Visit `/api/auth/providers`
- Visit `/api/db-check`
- Open a set and confirm inventory loads
- Sync works across refreshes

## 8) Cutover

- Decide final production domain.
- Update any references to the old Vercel URL.
- If applicable, set redirects from old domain to new Railway domain.

## 9) Rollback plan

- Keep Vercel deployment active until Railway is validated.
- Roll back by switching DNS or primary URL back to Vercel.
