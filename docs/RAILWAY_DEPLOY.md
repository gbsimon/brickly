# Railway Deployment Guide

This doc describes how to deploy Brickly on Railway using direct Postgres (no Prisma).

## 1) Create the Railway project

- Create a new Railway project at railway.app.
- Connect the GitHub repo.
- Railway will auto-detect `railway.toml` in the repo root:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

## 2) Environment variables

Set these in the Railway dashboard (or via `railway variables`).

**Required**:

- `REBRICKABLE_API_KEY`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
- `AUTH_URL` — must match Railway domain (e.g., `https://your-app.up.railway.app`)
- `NEXTAUTH_URL` — same as `AUTH_URL`
- `DATABASE_URL` — Postgres connection string (from Railway Postgres)

**Optional**:

- `AUTH_TRUST_HOST=true` — recommended for Railway (reverse proxy)
- `NODE_OPTIONS=--max-http-header-size=16384` — increase max HTTP header size (handles Railway proxy headers, already set in start script)
- `NEXT_PUBLIC_DEBUG_UI=true` — enable debug panel
- `NEXT_PUBLIC_DEBUG_CLIENT=true` — enable client debug logging
- `DEBUG_API=true` — enable API debug logging
- `DEBUG_DB=true` — enable DB debug logging

Notes:

- `AUTH_URL` and `NEXTAUTH_URL` must match the Railway domain exactly.
- `AUTH_TRUST_HOST=true` is recommended since Railway uses a reverse proxy.

## 3) Database setup

### Railway Postgres (Recommended)

1. In your Railway project dashboard, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**.
2. Railway will create a Postgres service and provide a `DATABASE_URL`.
3. Ensure `DATABASE_URL` is set for your app service (via service reference).

## 4) Verification

- `/api/health` returns `ok: true`
- `/api/db-check` returns `ok: true`
- Auth flow works end-to-end

## 5) Migrations

Migrations are manual SQL. Use Railway’s DB console or `psql` to apply schema changes.
