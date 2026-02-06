# Railway Deployment Guide

This doc describes how to deploy Brickly on Railway, including environment setup, database configuration, and operational checks.

## Quick answer: Do I need Prisma?

Yes. Prisma is used for schema migrations and runtime database queries. On Railway, you just supply the correct `DATABASE_URL` (and `PRISMA_DATABASE_URL`), and Prisma will run during the build/migration steps. There is no separate “Prisma service” to install.

## 1) Create the Railway project

- Create a new Railway project at [railway.app](https://railway.app).
- Connect the GitHub repo.
- Railway will auto-detect the `railway.toml` config in the repo root:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npx prisma migrate deploy && npm run build"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/api/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

- Build: installs deps, runs Prisma migrations, then builds Next.js
- Start: `next start` (via `npm run start`)
- Health check: `/api/health` endpoint
- Auto-restart on failure (up to 3 retries)

## 2) Environment variables

Set these in the Railway dashboard (or via `railway variables`).

**Required**:

- `REBRICKABLE_API_KEY`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_SECRET` (generate with: `openssl rand -base64 32`)
- `AUTH_URL` — must match Railway domain (e.g., `https://your-app.up.railway.app`)
- `NEXTAUTH_URL` — same as `AUTH_URL`
- `DATABASE_URL` — Postgres connection string (for migrations + Prisma Client)

**Optional**:

- `PRISMA_DATABASE_URL` — Prisma Accelerate URL (only if using Accelerate). If unset, Prisma uses `DATABASE_URL`.
- `AUTH_TRUST_HOST=true` — recommended for Railway (reverse proxy)
- `NEXT_PUBLIC_DEBUG_UI=true` — enable debug panel
- `NEXT_PUBLIC_DEBUG_CLIENT=true` — enable client debug logging
- `DEBUG_API=true` — enable API debug logging
- `DEBUG_DB=true` — enable DB debug logging

Notes:

- `AUTH_URL` and `NEXTAUTH_URL` must match the Railway domain exactly.
- `AUTH_TRUST_HOST=true` is recommended since Railway uses a reverse proxy.

## 3) Database setup

### Option A: Railway Postgres (Recommended)

**Step 1: Provision Postgres**

1. In your Railway project dashboard, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will create a new Postgres service and automatically provide a `DATABASE_URL` environment variable
3. The `DATABASE_URL` will be available to your app service via Railway's service reference system

**Step 2: Configure Environment Variables**

1. In your app service settings, verify `DATABASE_URL` is set:
   - Railway automatically sets this when Postgres is added as a service
   - You can reference it as `${{Postgres.DATABASE_URL}}` if needed
2. Set `PRISMA_DATABASE_URL`:
   - If using Prisma Accelerate: Set to your Accelerate connection URL
   - If not using Accelerate: Set to the same value as `DATABASE_URL`
   - **Note**: `PRISMA_DATABASE_URL` is required for production Prisma Client queries

**Step 3: Verify Connection**

After the first deployment, check the `/api/db-check` endpoint:

- Should return: `{ ok: true, result: [{ ok: 1 }], hasDatabaseUrl: true, hasPrismaDatabaseUrl: true }`
- If `hasDatabaseUrl` is false: `DATABASE_URL` is not set
- If `hasPrismaDatabaseUrl` is false: `PRISMA_DATABASE_URL` is not set

### Option B: External Postgres

1. Use your existing managed Postgres database (e.g., Supabase, Neon, AWS RDS)
2. Set `DATABASE_URL` to the direct connection string:
   - Format: `postgresql://user:password@host:port/database?schema=public`
3. Set `PRISMA_DATABASE_URL`:
   - If using Prisma Accelerate: Set to your Accelerate connection URL
   - If not using Accelerate: Set to the same value as `DATABASE_URL`
4. Ensure the database is reachable from Railway's build and runtime environments
5. Verify connection using `/api/db-check` endpoint

## 4) Migrations

### Automatic Migrations (Recommended)

Migrations run automatically during the Railway build step via `railway.toml`:

```toml
buildCommand = "npm install && npx prisma migrate deploy && npm run build"
```

**Build Process**:

1. `npm install` - Installs dependencies (triggers `postinstall` → `prisma generate`)
2. `npx prisma migrate deploy` - Applies pending migrations to the database
3. `npm run build` - Builds Next.js app (includes `prisma generate`)

**Prerequisites**:

- `DATABASE_URL` must be set and reachable from Railway's build environment
- Database must be accessible (not behind a firewall that blocks Railway IPs)

### Manual Migration (If Needed)

If migrations fail during build or you need to run them separately:

```bash
# Via Railway CLI
railway run npx prisma migrate deploy

# Or via Railway dashboard
# Open your app service → "Deployments" → "Run Command" → enter: npx prisma migrate deploy
```

### Verify Migrations Applied

1. **Check migration status**:

   ```bash
   railway run npx prisma migrate status
   ```

   Should show all migrations as "Applied"

2. **Verify schema matches**:
   - Check that all tables exist: `users`, `sets`, `inventories`, `progress`, `cached_sets`, `cached_inventories`
   - Verify indexes are created (see Index Verification section below)

3. **Check build logs**:
   - Railway build logs should show: "All migrations have been successfully applied"
   - No migration errors should appear

### Index Verification

The Prisma schema includes the following indexes that should be created:

**Sets table** (`sets`):

- Primary key: `[userId, setNum]`
- Index: `[userId]`
- Index: `[userId, lastOpenedAt]`
- Index: `[userId, isOngoing]`
- Index: `[userId, isHidden]`
- Index: `[userId, themeId]`

**Progress table** (`progress`):

- Primary key: `id`
- Unique constraint: `[userId, setNum, partNum, colorId, isSpare]`
- Index: `[userId, setNum]`

**Cached tables**:

- `cached_sets`: Index on `fetchedAt`
- `cached_inventories`: Index on `fetchedAt`

**Verify indexes** (optional, via Railway CLI):

```bash
railway run npx prisma studio
# Or connect directly and run:
# SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
```

### Prisma Client Generation

Prisma Client is generated automatically:

1. **During `npm install`**: The `postinstall` script runs `prisma generate`
2. **During `npm run build`**: The build script runs `prisma generate && next build`

**Verify Client Generation**:

- Check build logs for: "Generated Prisma Client"
- No TypeScript errors related to `@prisma/client` imports
- App routes using Prisma should work without import errors

## 5) OAuth redirect URIs

Update Google OAuth redirect URIs in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

- Add: `https://<railway-domain>/api/auth/callback/google`
- Keep the localhost URI for local dev: `http://localhost:3000/api/auth/callback/google`

## 6) PWA + static assets

Validate after deploy:

- `/manifest.json` returns 200 with correct app name
- Service worker (`/sw.js`) registers without errors
- App icons load properly
- App is installable ("Add to Home Screen" on iPad)

## 7) Verification checklist

### Database Verification

**Step 1: Check DB Connection**

- `GET /api/db-check` — Should return:
  ```json
  {
  	"ok": true,
  	"result": [{ "ok": 1 }],
  	"hasDatabaseUrl": true,
  	"hasPrismaDatabaseUrl": true
  }
  ```
- If `ok: false`, check Railway logs for connection errors
- If `hasDatabaseUrl: false`, verify `DATABASE_URL` is set in Railway
- If `hasPrismaDatabaseUrl: false`, verify `PRISMA_DATABASE_URL` is set

**Step 2: Verify Migrations**

- Check Railway build logs for: "All migrations have been successfully applied"
- Verify tables exist by attempting to sign in and add a set
- Check that data persists across deployments

**Step 3: Test Database Operations**

- Sign in with Google (creates/updates User record)
- Add a set to library (creates Set record)
- Open a set (creates/updates Inventory record)
- Update progress (creates/updates Progress records)
- Verify data persists after refresh

### Application Verification

After deployment, verify each endpoint:

- `GET /api/health` — returns `{ ok: true }`
- `GET /api/auth/providers` — lists Google provider
- `GET /api/db-check` — returns `{ ok: true, result: [{ ok: 1 }], hasDatabaseUrl: true, hasPrismaDatabaseUrl: true }`
- Sign in with Google — completes successfully
- Open a set — inventory loads
- Sync works across refreshes
- PWA installs and works offline

## 8) Cutover

- Confirm the final production domain (custom domain or Railway-provided).
- Update `AUTH_URL` / `NEXTAUTH_URL` to the final domain.
- Update Google OAuth redirect URIs for the final domain.
- Update any references to the old Vercel URL in documentation.
- If applicable, set DNS redirects from old domain to new Railway domain.

## 9) Troubleshooting

### Database Connection Issues

**Problem**: `/api/db-check` returns `ok: false` or `hasDatabaseUrl: false`

**Solutions**:

1. Verify `DATABASE_URL` is set in Railway dashboard
2. Check Railway Postgres service is running (not paused)
3. Verify database is accessible from Railway (not behind firewall)
4. Check connection string format: `postgresql://user:password@host:port/database?schema=public`
5. Review Railway logs for connection errors

**Problem**: Migrations fail during build

**Solutions**:

1. Check `DATABASE_URL` is set before build starts
2. Verify database is accessible (not paused, not behind firewall)
3. Run migrations manually: `railway run npx prisma migrate deploy`
4. Check migration status: `railway run npx prisma migrate status`
5. Review build logs for specific migration errors

**Problem**: `PRISMA_DATABASE_URL` not found errors

**Solutions**:

1. Set `PRISMA_DATABASE_URL` in Railway environment variables
2. If not using Accelerate, set it to the same value as `DATABASE_URL`
3. Verify it's set: Check `/api/db-check` response for `hasPrismaDatabaseUrl: true`

**Problem**: Prisma Client generation fails

**Solutions**:

1. Check `DATABASE_URL` is set (needed for schema introspection)
2. Verify `prisma/schema.prisma` is valid: `npx prisma validate`
3. Check build logs for Prisma generation errors
4. Ensure `postinstall` script runs: `"postinstall": "prisma generate"`

### Migration Issues

**Problem**: "Migration X is already applied" errors

**Solutions**:

1. Check migration status: `railway run npx prisma migrate status`
2. If migration is partially applied, may need to reset (dev only) or fix manually
3. For production, review migration files and apply manually if needed

**Problem**: Schema drift (database schema doesn't match Prisma schema)

**Solutions**:

1. Compare schema: `railway run npx prisma db pull` (creates schema from DB)
2. Review differences between `schema.prisma` and pulled schema
3. Create new migration if needed: `npx prisma migrate dev --name fix_schema_drift`
4. Apply migration: `railway run npx prisma migrate deploy`

### Index Issues

**Problem**: Queries are slow (missing indexes)

**Solutions**:

1. Verify indexes exist: Check Railway logs or use `prisma studio`
2. Review `prisma/schema.prisma` for all `@@index` directives
3. Create migration to add missing indexes if needed
4. Common indexes needed: `[userId]`, `[userId, setNum]`, `[userId, lastOpenedAt]`

## 10) Rollback plan

- Keep Vercel deployment active until Railway is fully validated.
- Roll back by switching DNS or primary URL back to Vercel.
- Both environments should share the same database during the transition period.
- If database issues occur, Railway Postgres can be paused/resumed without data loss (Railway handles backups).
