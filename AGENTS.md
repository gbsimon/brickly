# Brickly — Agent Brief (Cursor / Composer)

This file is the canonical context for the Brickly project. Use it to keep continuity across chats and to align implementation decisions.

## 1) Product summary

Brickly is an iPad-first PWA to help rebuild LEGO sets by checking off parts from an inventory list.

Core workflows:

- Search sets (Rebrickable)
- Add a set to your library
- Open a set inventory list
- Increment/decrement “found” counts per part
- Hide parts once complete (optional toggle)
- Persist progress
- (Next) Filter/sort/group parts for usability on large inventories
- (Next) Multi-device sync via DB + Auth

## 2) Current status

Completed:

- Tickets 001-024: Complete (see PROJECT_SCOPE.md for details)

Ticket status table:

| Ticket | Title                                            | Status                                                   |
| ------ | ------------------------------------------------ | -------------------------------------------------------- |
| 001    | Scaffold Next.js + basic UI shell                | Done                                                     |
| 002    | PWA setup                                        | Done                                                     |
| 003    | Vercel API proxy: health + Rebrickable wrapper   | Done                                                     |
| 004    | Dexie DB schema                                  | Done                                                     |
| 005    | Set Search UI + Add to Library                   | Done                                                     |
| 006    | Set detail checklist                             | Done                                                     |
| 007    | Library progress summary + remove                | Done                                                     |
| 008    | Add Auth (Auth.js)                               | Done                                                     |
| 009    | Add Postgres                                     | Done                                                     |
| 010    | Sync library to DB                               | Done                                                     |
| 011    | Sync progress to DB                              | Done                                                     |
| 012    | Parts filter & sort controls (Set Checklist)     | Done                                                     |
| 013    | Group parts list by color (collapsible sections) | Done                                                     |
| 014    | Rebrickable sync                                 | Done                                                     |
| 015    | Auth + session robustness                        | Done                                                     |
| 016    | Sync reliability + conflict handling (v1)        | Done                                                     |
| 017    | Set checklist performance pass                   | Done                                                     |
| 018    | Server DB helpers + indexes audit                | Done                                                     |
| 019    | Observability and error reporting                | Done                                                     |
| 020    | Basic test coverage (smoke)                      | Done                                                     |
| 021    | Localization support                             | Done                                                     |
| 022    | Include minifigs in parts list                   | Done                                                     |
| 023    | Question/comment popup                           | Done                                                     |
| 024    | Sets page search/sort/filter bar                 | Done                                                     |
| 025    | Proxy + auth route rate limiting                 | Done                                                     |
| 026    | Auth/session coverage audit                      | Done                                                     |
| 027    | Cache headers and invalidation                   | Done                                                     |
| 028    | Offline and sync UX                              | Done                                                     |
| 029    | Accessibility pass                               | Done                                                     |
| 030    | Dexie migration strategy                         | Done                                                     |
| 031    | Building instructions PDF viewer                 | Cancelled (Rebrickable API doesn't provide instructions) |
| 032    | Global Rebrickable cache                         | Done                                                     |
| 033    | Debugging helpers and env toggles                | Done                                                     |
| 034    | Hidden sets category + filter toggle             | Done                                                     |
| 035    | Migrate deployment to Railway                    | Done                                                     |
| 036    | Railway DB setup + migration                     | Done                                                     |
| 037    | Additional auth providers                        | Pending                                                  |
| 038    | Home progress bar visibility fixes               | Pending                                                  |
| 039    | Multi-device progress conflict handling audit    | Pending                                                  |
| 040    | Remove Prisma (temporary)                        | Done                                                     |
Deployment: Railway (migrating from Vercel)

- Previous Vercel URL: https://brickly-ten.vercel.app
- Railway domain: TBD (configure in Railway dashboard)

Known issue area:

- Local auth + some local API routes returning 500 (usually missing env/migrations/session guards). See Debugging section.

## 3) Stack & conventions

Frontend:

- Next.js (App Router)
- React + TypeScript
- PWA (manifest + service worker)
- Styling: custom CSS/SCSS with iOS-like design system tokens (see globals)

Backend:

- Next.js route handlers under `app/api/**`
- Rebrickable proxy (server-side to hide API key)
- Auth: next-auth v5 beta (Auth.js)
- DB: Postgres (Railway or external) via `postgres` client

Local persistence:

- Dexie (IndexedDB) for:
  - cached inventories
  - cached progress
  - UI preferences (hide completed, filter/sort/group state)
- Goal: keep Dexie as offline/fast cache even after DB sync.

Coding conventions:

- TypeScript everywhere
- 2-space indentation
- Keep route handlers in Node runtime when using DB access:
  - `export const runtime = "nodejs"`
- If a route depends on auth/session data:
  - `export const dynamic = "force-dynamic"`
- Avoid caching routes that depend on auth or redirects.

## 4) Architecture overview

### 4.1 Rebrickable integration (proxy)

All Rebrickable calls should go server-side via our API routes to avoid exposing the API key.

Key proxy routes (implemented / planned):

- GET `/api/health`
- GET `/api/sets/search?q=...`
- GET `/api/sets/:setNum`
- GET `/api/sets/:setNum/parts`

**Rate Limiting** (Ticket 025):

- Proxy routes: 60 requests per minute per IP
- Auth routes: 10 sign-in attempts per 15 minutes per IP
- Rate limit responses include standard headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: ISO timestamp when limit resets
  - `Retry-After`: Seconds until retry is allowed
- Implementation uses in-memory store (per serverless function instance)
- For production at scale, consider upgrading to Redis-based rate limiting

**Cache Headers** (Ticket 027):

All Rebrickable proxy routes use HTTP cache headers to reduce API calls and improve performance:

- **`GET /api/sets/search`**:
  - `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
  - Cache duration: 5 minutes (300s)
  - Stale-while-revalidate: 10 minutes (600s)
  - Rationale: Search results change frequently, shorter cache prevents stale results

- **`GET /api/sets/[setNum]`**:
  - `Cache-Control: public, s-maxage=3600, stale-while-revalidate=7200`
  - Cache duration: 1 hour (3600s)
  - Stale-while-revalidate: 2 hours (7200s)
  - Rationale: Set details rarely change, longer cache reduces API load

- **`GET /api/sets/[setNum]/parts`**:
  - `Cache-Control: public, s-maxage=3600, stale-while-revalidate=7200`
  - Cache duration: 1 hour (3600s)
  - Stale-while-revalidate: 2 hours (7200s)
  - Rationale: Inventory parts are stable, longer cache is appropriate

**Cache Behavior**:

- `s-maxage`: CDN/edge cache duration (if a CDN is configured in front of Railway)
- `stale-while-revalidate`: Allows serving stale content while fetching fresh data in background
- `public`: Allows caching by CDNs and browsers
- Client-side caching: Inventory is also cached in IndexedDB (Dexie) for offline access

**Revalidation & Refresh Policy**:

- **Automatic revalidation**: Cache revalidates in background after `s-maxage` expires
- **Stale content**: Served for up to `stale-while-revalidate` duration while fresh data loads
- **Manual refresh**: Client can bypass cache by:
  - Adding `?refresh=true` query parameter (future enhancement)
  - Clearing IndexedDB cache and refetching
  - Using browser hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- **Inventory refresh**: When user manually refreshes inventory:
  - Client fetches from API (may use stale cache if within window)
  - Updates IndexedDB cache
  - Progress is preserved (stored separately)

**When to Invalidate Cache**:

- Set details change (rare, but possible if Rebrickable updates metadata)
- Inventory corrections (if Rebrickable fixes part lists)
- Manual user refresh action
- Cache automatically expires after configured duration

**Best Practices**:

- Don't add cache headers to routes that depend on user session/auth
- Use `export const dynamic = "force-dynamic"` for routes with cache headers (prevents Next.js static optimization)
- Keep cache durations reasonable to balance freshness vs. API load
- Client-side IndexedDB cache provides additional offline resilience

### 4.2 App data (multi-device sync)

We are moving toward a “cloud source of truth” for:

- user library of sets
- progress (found counts) per set
- settings per set

Dexie remains a local cache; DB becomes authoritative once sync is enabled.

## 5) Authentication (next-auth v5 beta)

Pattern used:

- `auth.ts` at repo root (recommended v5)
- route handler re-exports `handlers`:
  - `app/api/auth/[...nextauth]/route.ts` exports GET/POST
- Client session:
  - `SessionProvider` is wrapped at app root via `app/providers.tsx` and `app/layout.tsx`
- Use Google provider for sign-in.

Important env vars (Railway + local):

**Required:**

- `AUTH_GOOGLE_ID` - Google OAuth client ID
- `AUTH_GOOGLE_SECRET` - Google OAuth client secret
- `NEXTAUTH_SECRET` - Secret for signing tokens (generate with: `openssl rand -base64 32`)
- `AUTH_URL` - Base URL for auth callbacks (e.g., `http://localhost:3000` or `https://your-app.vercel.app`)
- `NEXTAUTH_URL` - Base URL (same as AUTH_URL)

**Optional:**

- `AUTH_TRUST_HOST=true` - Trust host header (useful for local dev with proxies)
- `NEXTAUTH_DEBUG=true` - Enable debug logging (development only)

**Debug Flags (Ticket 033):**

- `NEXT_PUBLIC_DEBUG_UI=true` - Enable debug panel UI (client-side)
- `NEXT_PUBLIC_DEBUG_CLIENT=true` - Enable verbose client-side logging
- `DEBUG_API=true` - Enable verbose API route logging (server-side)
- `DEBUG_DB=true` - Enable verbose database query logging (server-side)

**Note:** All debug flags are disabled by default. They must be explicitly set to `"true"` to enable. Debug features never run in production unless explicitly enabled via environment variables.

**Note:** See `.env.example` (if available) or create `.env.local` with these variables. The app will show a friendly error message on the sign-in page if required auth variables are missing.

Local testing notes:

- On Mac: use `AUTH_URL=http://localhost:3000`
- Also set `NEXTAUTH_URL=http://localhost:3000`
- On iPad: localhost will NOT work; use Railway URL or LAN IP/tunnel.
- If local callbacks fail due to host headers:
  - set `AUTH_TRUST_HOST=true`
  - and/or `trustHost: true` in auth config.

## 6) Database

Postgres (Railway or external) via `postgres` client.

**Key files:**
- `lib/db/client.ts` — Postgres client singleton
- `lib/db/*` — DB helpers (SQL)
- `lib/db/sets.ts` — set CRUD operations
- `lib/db/users.ts` — user upsert/lookup
- `lib/db/progress.ts` — progress save/fetch with batch support
- `lib/db/cache.ts` — global Rebrickable cache (CachedSet, CachedInventory)

**Build pipeline:**
- Railway build: `npm install && npm run build`

**Environment variables (required):**
- `DATABASE_URL` — Postgres connection string

**DB Check Endpoint:**
- GET `/api/db-check` — runs `SELECT 1`, reports env variable presence

## 16) Debugging Helpers (Ticket 033)

### Debug Flags

Debug features are controlled via environment variables and are **disabled by default**:

- **`NEXT_PUBLIC_DEBUG_UI=true`** - Enables debug panel UI (floating button)
  - Shows environment info, session data, screen dimensions
  - Provides "Clear LocalStorage" utility
  - Only visible when flag is set

- **`NEXT_PUBLIC_DEBUG_CLIENT=true`** - Enables verbose client-side logging
  - Formats client errors/warnings with pretty JSON
  - Adds context (route, setNum, lastAction) to logs
  - Useful for debugging client-side issues

- **`DEBUG_API=true`** - Enables verbose API route logging
  - Shows debug-level logs from API routes
  - Includes request IDs, durations, and context
  - Server-side only

- **`DEBUG_DB=true`** - Enables verbose database logging
  - Logs database queries and operations
  - Useful for debugging DB connection issues
  - Server-side only

### Diagnostics Component

A small diagnostics bar appears at the bottom of the screen showing:

- Current environment (development/production)
- Enabled debug flags (if any)

This helps verify debug configuration without exposing sensitive information.

### Debug Utilities

**Location**: `lib/debug.ts`

Provides helper functions:

- `isDebugUIEnabled()` - Check if debug UI should show
- `isAPIDebugEnabled()` - Check if API debug logging is enabled
- `isDBDebugEnabled()` - Check if DB debug logging is enabled
- `isClientDebugEnabled()` - Check if client debug logging is enabled
- `getEnabledDebugFlags()` - Get list of enabled flags (safe for display)

### Best Practices

1. **Never enable debug flags in production** unless debugging a specific issue
2. **Use `NEXT_PUBLIC_` prefix** for client-side flags (exposed to browser)
3. **Server-side flags** (`DEBUG_API`, `DEBUG_DB`) are never exposed to client
4. **Debug panel** only shows when `NEXT_PUBLIC_DEBUG_UI=true`
5. **Diagnostics bar** shows in development or when debug flags are enabled

### Example Usage

**Local Development** (`.env.local`):

```env
NEXT_PUBLIC_DEBUG_UI=true
NEXT_PUBLIC_DEBUG_CLIENT=true
DEBUG_API=true
```

**Production Debugging** (Railway environment variables):

```env
DEBUG_API=true  # Only enable when debugging specific API issue
```

**Note**: Debug flags are opt-in only. They never run unless explicitly enabled.

## 7) Environment variables

Local: `.env.local` (never commit)

- `REBRICKABLE_API_KEY=...`
- Auth vars:
  - `AUTH_GOOGLE_ID=...`
  - `AUTH_GOOGLE_SECRET=...`
  - `AUTH_SECRET=...`
  - `AUTH_URL=http://localhost:3000`
  - `AUTH_TRUST_HOST=true` (if needed)
- DB:
  - `DATABASE_URL=...` (migrations + local dev)
  - Optional: `POSTGRES_URL` or `DIRECT_URL` (migrations)

Railway (Production):

- `REBRICKABLE_API_KEY`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_SECRET`
- `AUTH_URL=https://<railway-domain>` (update to your Railway domain)
- `DATABASE_URL`
- `PRISMA_DATABASE_URL`

**Debug Flags** (Optional, disabled by default):

- `NEXT_PUBLIC_DEBUG_UI=true` - Enable debug panel
- `NEXT_PUBLIC_DEBUG_CLIENT=true` - Enable client debug logging
- `DEBUG_API=true` - Enable API debug logging
- `DEBUG_DB=true` - Enable DB debug logging

Recommended workflow:

- Copy `.env.example` to `.env.local` and fill in values
- Or use `railway variables` to export Railway env vars locally

## 8) How to run locally

- `npm install`
- `npm run dev`
- Visit:
  - http://localhost:3000

Validate core services:

- http://localhost:3000/api/health
- http://localhost:3000/api/auth/providers
- http://localhost:3000/api/db-check

## 9) How to test auth locally vs Railway

Railway:

- Works at `https://<railway-domain>` (your Railway deployment URL)
- Must include redirect URI in Google console:
  - `https://<railway-domain>/api/auth/callback/google`

Local on Mac:

- Ensure env:
  - `AUTH_URL=http://localhost:3000`
- Add redirect URI in Google console:
  - `http://localhost:3000/api/auth/callback/google`
- Test:
  - `/api/auth/signin`
  - `/api/auth/session`

Local on iPad (if needed):

- Use Railway URL or LAN IP/tunnel
- Do NOT use localhost.

## 10) Debugging 500s (local API)

Rule of thumb:

- If `/api/db-check` fails locally: you're missing `DATABASE_URL` locally.
  - Fix: set `DATABASE_URL` in `.env.local` + restart.
- If DB works but `/api/sets` or `/api/sets/:id/progress` 500:
  - Check if route requires auth session and is throwing instead of returning 401.
  - Ensure database is reachable and schema is up to date (manual SQL migrations)
  - Ensure route uses Node runtime: `export const runtime = "nodejs"`
  - Wrap handler in try/catch and return JSON error payload for visibility.

## 11) Current backlog tickets (active)

Remaining tickets (see PROJECT_SCOPE.md for full scope/acceptance):

- Ticket 037 — Additional auth providers
- Ticket 038 — Home progress bar visibility fixes
- Ticket 039 — Multi-device progress conflict handling audit

## 12) Design direction

UI should feel iOS-native:

- System font stack (SF Pro on iOS)
- Large titles, grouped lists, frosted blur cards
- 44px tap targets
- Dark mode friendly
- Safe-area padding (`env(safe-area-inset-*)`)

This project uses two data layers:

- Server DB: Postgres via `postgres` client.
- Client DB: IndexedDB via Dexie for offline/cache.

## 13) Data flow & DB rules

How it works today:

- Auth is NextAuth (Google). `session.user.id` is the provider subject.
- Server routes call `ensureUser(...)` to resolve the canonical user record.
  - If a user exists by email, `ensureUser` returns that record.
  - API routes must use `user.id` returned by `ensureUser`, not `session.user.id`.
- No ORM or Accelerate layer is used.
  - `DATABASE_URL` is still used for schema/migrations.
- Sync flow:
  - Client writes to IndexedDB first.
  - Client then calls `/api/sets/*` to persist server-side.
  - On login/mount, client calls `/api/sets/sync` to pull server data and refresh IndexedDB.

When adding DB features (rules):

1. Always call `ensureUser` in server routes before any DB write/read.
   - Use `const user = await ensureUser(...)` and pass `user.id` to DB helpers.
2. Keep the same offline-first pattern:
   - Update IndexedDB first.
   - Then call the API to persist server-side.
3. If you add a new server route:
   - Set `export const runtime = "nodejs"` for DB access.
   - Set `export const dynamic = "force-dynamic"` if it depends on auth/session.
4. If you add a new DB table or column:
   - Add indexes for `userId` and any composite lookups used in routes.
   - Provide a DB helper in `lib/db/*` and call it from API routes.

Debug checklist:

- 401 from API: check NextAuth session and middleware rules.
- 500 P2025: usually wrong userId; verify `ensureUser` + `user.id` usage.
- Build errors on Railway: confirm `PRISMA_DATABASE_URL` is set for the deploy environment.

## 14) Auth/Session Coverage Checklist (Ticket 026)

### API Routes Requiring Authentication

All routes that access user data must:

- ✅ Check for session: `const session = await auth()`
- ✅ Return 401 if unauthenticated: `if (!session?.user?.id) return 401`
- ✅ Use `ensureUser` to resolve canonical user ID
- ✅ Use `user.id` (not `session.user.id`) for all DB operations
- ✅ Set `export const dynamic = "force-dynamic"` (if auth-dependent)
- ✅ Set `export const runtime = "nodejs"` (if using DB access)

**Protected DB Routes:**

- ✅ `POST /api/sets` - Add set to library
- ✅ `DELETE /api/sets/[setNum]` - Remove set from library
- ✅ `GET /api/sets/sync` - Sync sets from DB
- ✅ `GET /api/sets/[setNum]/progress` - Get progress for a set
- ✅ `POST /api/sets/[setNum]/progress` - Save progress for a set
- ✅ `PATCH /api/sets/[setNum]/ongoing` - Toggle ongoing status

**Public/System Routes (No Auth Required):**

- ✅ `GET /api/health` - Health check
- ✅ `GET /api/db-check` - DB connection check
- ✅ `GET /api/auth/check` - Auth config check
- ✅ `GET/POST /api/auth/[...nextauth]` - Auth handler
- ✅ `GET /api/sets/search` - Rebrickable proxy (no DB)
- ✅ `GET /api/sets/[setNum]` - Rebrickable proxy (no DB)
- ✅ `GET /api/sets/[setNum]/parts` - Rebrickable proxy (no DB)

### Middleware Protection

- ✅ Frontend routes (`/` and `/sets`) are protected by middleware
- ✅ Unauthenticated users are redirected to sign-in
- ✅ API routes handle their own auth (not protected by middleware)

### When Adding New Routes

1. **If route accesses user data:**
   - Add auth check at the start
   - Use `ensureUser` before any DB operation
   - Use `user.id` for all DB queries
   - Return 401 if unauthenticated

2. **If route is public/proxy:**
   - Document why it doesn't require auth
   - Ensure it doesn't expose user data

3. **Always:**
   - Set appropriate `runtime` and `dynamic` exports
   - Use DB helpers from `lib/db/*` (don't call Prisma directly)
   - Log auth failures for debugging

## 15) Migration Strategy (Ticket 030)

### Dexie Schema Versioning (Client-Side IndexedDB)

**Location**: `db/database.ts`

**Current Version**: 4

**Versioning Rules**:

1. **Always increment version number** when changing schema:

   ```typescript
   this.version(N).stores({ ... })
   ```

2. **Define complete schema** for each version (don't rely on inheritance):
   - Each version must specify all stores and indexes
   - Dexie will automatically migrate from previous version

3. **Use `.upgrade()` callback** for data migrations:

   ```typescript
   this.version(N).stores({ ... }).upgrade(async (tx) => {
     // Migrate existing data
     await tx.table('sets').toCollection().modify((set) => {
       if (set.newField === undefined) {
         set.newField = defaultValue;
       }
     });
   });
   ```

4. **Migration Best Practices**:
   - Always check if field exists before setting default
   - Use `toCollection().modify()` for bulk updates
   - Handle missing data gracefully (use defaults)
   - Test migrations with existing data

5. **Breaking Changes Protocol**:
   - **Field removal**: Remove from schema, handle missing fields in code
   - **Field rename**: Add new field, migrate data, remove old field in next version
   - **Store removal**: Clear store in upgrade callback before removing from schema
   - **Index changes**: Old indexes are automatically dropped, new ones created

**Example Migration**:

```typescript
// Version 4: Add new field with migration
this.version(4)
	.stores({
		sets: "setNum, name, addedAt, lastOpenedAt, isOngoing, newField",
		// ... other stores
	})
	.upgrade(async (tx) => {
		await tx
			.table("sets")
			.toCollection()
			.modify((set) => {
				if (set.newField === undefined) {
					set.newField = "defaultValue"
				}
			})
	})
```

**Testing Migrations**:

- Test with existing IndexedDB data from previous version
- Verify data integrity after migration
- Check that new fields have correct defaults
- Ensure queries still work with migrated data

### Database Migrations (Server-Side)

Migrations are managed manually with SQL against Postgres. Use Railway’s DB console or `psql` to apply schema changes. Keep changes additive when possible and add indexes for new query patterns.

### Breaking Change Protocol for Cached Data

**When Client Schema Changes**:

1. **Version Bump**: Increment Dexie version number
2. **Migration Logic**: Handle old data format in upgrade callback
3. **Backward Compatibility**: Code should handle both old and new formats during transition
4. **Clear Cache Option**: Provide way to clear IndexedDB if migration fails

**When Server Schema Changes**:

1. **API Compatibility**: Maintain API compatibility during transition
2. **Data Migration**: Run server-side migration before deploying new client code
3. **Client Sync**: Client will sync new schema on next sync operation
4. **Rollback Plan**: Keep ability to rollback if migration fails

**Coordination Between Client and Server**:

- **Client-first changes**: Deploy client with migration, server accepts both formats
- **Server-first changes**: Deploy server migration, update client to handle new format
- **Breaking changes**: Coordinate deployment, may require cache invalidation

**Cache Invalidation Strategy**:

- **Schema version mismatch**: Clear IndexedDB and resync from server
- **Data corruption**: Detect and clear corrupted cache
- **Migration failure**: Log error, allow user to clear cache manually
