# BrickByBrick Agent Notes

This project uses two data layers:
- Server DB: Postgres via Prisma.
- Client DB: IndexedDB via Dexie for offline/cache.

## How it works today
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

## When adding DB features (rules)
1) Always call `ensureUser` in server routes before any DB write/read.
   - Use `const user = await ensureUser(...)` and pass `user.id` to DB helpers.
2) Keep the same offline-first pattern:
   - Update IndexedDB first.
   - Then call the API to persist server-side.
3) If you add a new server route:
   - Set `export const runtime = "nodejs"` for Prisma.
   - Set `export const dynamic = "force-dynamic"` if it depends on auth/session.
4) If you add a new Prisma model:
   - Add indexes for `userId` and any composite lookups used in routes.
   - Provide a DB helper in `lib/db/*` and call it from API routes.
5) Avoid caching routes that depend on auth or redirects.
6) If you touch Prisma Client configuration:
   - Do not remove `accelerateUrl` when `PRISMA_DATABASE_URL` is present.
   - Keep `DATABASE_URL` for migrations and local dev.

## Environment variables
- `PRISMA_DATABASE_URL`: Prisma Accelerate URL (required in production).
- `DATABASE_URL`: Postgres connection (migrations and local dev).
- `POSTGRES_URL` or `DIRECT_URL`: optional direct connection for migrations.

## Debug checklist
- 401 from API: check NextAuth session and middleware rules.
- 500 P2025: usually wrong userId; verify `ensureUser` + `user.id` usage.
- Build errors on Vercel: confirm `PRISMA_DATABASE_URL` is set for the deploy environment.
