# BrickByBrick — Agent Brief (Cursor / Composer)

This file is the canonical context for the BrickByBrick project. Use it to keep continuity across chats and to align implementation decisions.

## 1) Product summary

BrickByBrick is an iPad-first PWA to help rebuild LEGO sets by checking off parts from an inventory list.

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

- Ticket 001: Next.js scaffold + basic UI shell
- Ticket 002: PWA installable (Add to Home Screen works)
- Ticket 003: Rebrickable proxy routes (health + search) implemented and working
- Ticket 004: Dexie schema done (local caching/progress)
- Ticket 005: Set Search UI + Add to library done
- Ticket 008: Google Auth on Vercel is working (Auth.js / next-auth v5 beta)
- Ticket 009: DB connectivity confirmed (Prisma can connect; db-check returns ok)

Temp deployment domain:

- https://brickbybrick-ten.vercel.app

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
- DB: Vercel Postgres + Prisma

Local persistence:

- Dexie (IndexedDB) for:
  - cached inventories
  - cached progress
  - UI preferences (hide completed, filter/sort/group state)
- Goal: keep Dexie as offline/fast cache even after DB sync.

Coding conventions:

- TypeScript everywhere
- 2-space indentation
- Keep route handlers in Node runtime when using Prisma:
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

Important env vars (Vercel + local):

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (base URL; set to Vercel domain in production)
- `AUTH_URL` (base URL; set to Vercel domain in production)
  Optional:
- `NEXTAUTH_DEBUG=true` (only while debugging)

Local testing notes:

- On Mac: use `AUTH_URL=http://localhost:3000`
- Also set `NEXTAUTH_URL=http://localhost:3000`
- On iPad: localhost will NOT work; use Vercel URL or LAN IP/tunnel.
- If local callbacks fail due to host headers:
  - set `AUTH_TRUST_HOST=true`
  - and/or `trustHost: true` in auth config.

## 6) Database (Prisma + Postgres)

Prisma:

- `prisma/schema.prisma`
- `lib/prisma.ts` exports singleton PrismaClient (HMR-safe)
- Server routes must call `ensureUser(...)` before any DB read/write and
  use the returned `user.id` (not `session.user.id`).

Vercel build:

- Use `vercel-build` script to run:
  - `prisma generate`
  - `prisma migrate deploy`
  - `next build`

Environment:

- Production requires `PRISMA_DATABASE_URL` (Prisma Accelerate).
- `DATABASE_URL` is still required for schema/migrations and local dev.
- Optional migration helpers: `POSTGRES_URL` or `DIRECT_URL`.

DB connectivity test endpoint (for debugging):

- GET `/api/db-check`
  Should return:
- `{ ok: true, result: [{ ok: 1 }], hasDatabaseUrl: true }`

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
  - `PRISMA_DATABASE_URL=...` (Prisma Accelerate; required in prod)
  - Optional: `POSTGRES_URL` or `DIRECT_URL` (migrations)

Vercel (Production + Preview):

- `REBRICKABLE_API_KEY`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_SECRET`
- `AUTH_URL=https://brickbybrick-ten.vercel.app`
- `DATABASE_URL`
- `PRISMA_DATABASE_URL`

Recommended workflow:

- `vercel link`
- `vercel env pull .env.local`

## 8) How to run locally

- `npm install`
- `npm run dev`
- Visit:
  - http://localhost:3000

Validate core services:

- http://localhost:3000/api/health
- http://localhost:3000/api/auth/providers
- http://localhost:3000/api/db-check

## 9) How to test auth locally vs Vercel

Vercel:

- Works at https://brickbybrick-ten.vercel.app
- Must include redirect URI in Google console:
  - `https://brickbybrick-ten.vercel.app/api/auth/callback/google`

Local on Mac:

- Ensure env:
  - `AUTH_URL=http://localhost:3000`
- Add redirect URI in Google console:
  - `http://localhost:3000/api/auth/callback/google`
- Test:
  - `/api/auth/signin`
  - `/api/auth/session`

Local on iPad (if needed):

- Use Vercel OR a LAN IP/tunnel
- Do NOT use localhost.

## 10) Debugging 500s (local API)

Rule of thumb:

- If `/api/db-check` fails locally: you’re missing `DATABASE_URL` locally.
  - Fix: `vercel env pull .env.local` + restart.
- If DB works but `/api/sets` or `/api/sets/:id/progress` 500:
  - Check if route requires auth session and is throwing instead of returning 401.
  - Ensure Prisma migrations ran locally: `npx prisma migrate dev`
  - Ensure route uses Node runtime: `export const runtime = "nodejs"`
  - Wrap handler in try/catch and return JSON error payload for visibility.

## 11) Current backlog tickets (active)

### Ticket 012 — Filter + Sort controls (Checklist)

Add controls on set checklist page:

- Filter by Color (dropdown)
- Sort by:
  - Color
  - Parts remaining (needed - found)
  - Part number
- Recommended: sort direction (asc/desc)
  Rules:
- Filter first, then sort
- “Remaining” = max(needed - found, 0)
- Persist per set in Dexie (preferred)
  Acceptance:
- Immediate UI updates
- Works with Hide Completed
- Smooth on iPad (use memoization)

### Ticket 013 — Grouped view by Color (collapsible sections)

Add view mode toggle:

- List (current)
- Grouped (new)

Grouped mode:

- Group parts by colorId/colorName
- Collapsible sections (tap header)
- Show group totals (remaining/needed or item count)
- Hide completed applies; optionally hide empty groups
  Persist:
- view mode + collapsed sections per set (Dexie)
  Compatibility:
- Color filter works in grouped mode
- Within group sorting defaults to part number (or respects Ticket 012 sortKey)

## 12) Design direction

UI should feel iOS-native:

- System font stack (SF Pro on iOS)
- Large titles, grouped lists, frosted blur cards
- 44px tap targets
- Dark mode friendly
- Safe-area padding (`env(safe-area-inset-*)`)

This project uses two data layers:

- Server DB: Postgres via Prisma.
- Client DB: IndexedDB via Dexie for offline/cache.

## 13) Data flow & DB rules

How it works today:

- Auth is NextAuth (Google). `session.user.id` is the provider subject.
- Server routes call `ensureUser(...)` to resolve the canonical user record.
  - If a user exists by email, `ensureUser` returns that record.
  - API routes must use `user.id` returned by `ensureUser`, not `session.user.id`.
- Prisma uses Prisma Postgres/Accelerate in production.
  - `PRISMA_DATABASE_URL` is required for the Prisma Client constructor (`accelerateUrl`).
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
   - Set `export const runtime = "nodejs"` for Prisma.
   - Set `export const dynamic = "force-dynamic"` if it depends on auth/session.
4. If you add a new Prisma model:
   - Add indexes for `userId` and any composite lookups used in routes.
   - Provide a DB helper in `lib/db/*` and call it from API routes.
5. If you touch Prisma Client configuration:
   - Do not remove `accelerateUrl` when `PRISMA_DATABASE_URL` is present.
   - Keep `DATABASE_URL` for migrations and local dev.

Debug checklist:

- 401 from API: check NextAuth session and middleware rules.
- 500 P2025: usually wrong userId; verify `ensureUser` + `user.id` usage.
- Build errors on Vercel: confirm `PRISMA_DATABASE_URL` is set for the deploy environment.
