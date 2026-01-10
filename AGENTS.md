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

- Tickets 001-024: Complete (see PROJECT_SCOPE.md for details)

Ticket status table:

| Ticket | Title | Status |
| --- | --- | --- |
| 001 | Scaffold Next.js + basic UI shell | Done |
| 002 | PWA setup | Done |
| 003 | Vercel API proxy: health + Rebrickable wrapper | Done |
| 004 | Dexie DB schema | Done |
| 005 | Set Search UI + Add to Library | Done |
| 006 | Set detail checklist | Done |
| 007 | Library progress summary + remove | Done |
| 008 | Add Auth (Auth.js) | Done |
| 009 | Add Postgres + Prisma | Done |
| 010 | Sync library to DB | Done |
| 011 | Sync progress to DB | Done |
| 012 | Parts filter & sort controls (Set Checklist) | Done |
| 013 | Group parts list by color (collapsible sections) | Done |
| 014 | Rebrickable sync | Done |
| 015 | Auth + session robustness | Done |
| 016 | Sync reliability + conflict handling (v1) | Done |
| 017 | Set checklist performance pass | Done |
| 018 | Server DB helpers + indexes audit | Done |
| 019 | Observability and error reporting | Done |
| 020 | Basic test coverage (smoke) | Done |
| 021 | Localization support | Done |
| 022 | Include minifigs in parts list | Done |
| 023 | Question/comment popup | Done |
| 024 | Sets page search/sort/filter bar | Done |
| 025 | Proxy + auth route rate limiting | Pending |
| 026 | Auth/session coverage audit | Pending |
| 027 | Cache headers and invalidation | Pending |
| 028 | Offline and sync UX | Pending |
| 029 | Accessibility pass | Pending |
| 030 | Dexie + Prisma migration strategy | Pending |
| 031 | Building instructions PDF viewer | Pending |

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

**Required:**

- `AUTH_GOOGLE_ID` - Google OAuth client ID
- `AUTH_GOOGLE_SECRET` - Google OAuth client secret
- `NEXTAUTH_SECRET` - Secret for signing tokens (generate with: `openssl rand -base64 32`)
- `AUTH_URL` - Base URL for auth callbacks (e.g., `http://localhost:3000` or `https://your-app.vercel.app`)
- `NEXTAUTH_URL` - Base URL (same as AUTH_URL)

**Optional:**

- `AUTH_TRUST_HOST=true` - Trust host header (useful for local dev with proxies)
- `NEXTAUTH_DEBUG=true` - Enable debug logging (development only)

**Note:** See `.env.example` (if available) or create `.env.local` with these variables. The app will show a friendly error message on the sign-in page if required auth variables are missing.

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

Remaining tickets (see PROJECT_SCOPE.md for full scope/acceptance):

- Ticket 025 — Proxy + auth route rate limiting
- Ticket 026 — Auth/session coverage audit
- Ticket 027 — Cache headers and invalidation
- Ticket 028 — Offline and sync UX
- Ticket 029 — Accessibility pass
- Ticket 030 — Dexie + Prisma migration strategy
- Ticket 031 — Building instructions PDF viewer

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
