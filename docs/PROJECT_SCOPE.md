# Brickly - Project Scope

**Note:** Prisma has been removed. Database access uses the `postgres` client. Prisma-related sections below are historical.

## Project Setup Decisions (Locked)

- **App**: PWA (iPad-first)
- **Hosting**: Railway
- **Backend**: Next.js API route handlers as a Rebrickable proxy (hide API key + caching)
- **Frontend**: Next.js App Router (React + TS)
- **Storage**: IndexedDB via Dexie for:
  - My Sets library
  - Inventory cache
  - Progress (found counts + preferences)

---

## Repo Structure (Next.js Suggestion)

```
apps/web (or root if single app)
├── app/ (routes)
├── components/
├── lib/
├── rebrickable/ (types + API client for proxy calls)
├── db/ (Dexie schema + queries)
├── app/api/ (Next.js API route handlers)
│   ├── sets/search/route.ts
│   ├── sets/[setNum]/route.ts
│   └── sets/[setNum]/parts/route.ts
├── .env.local
│   └── REBRICKABLE_API_KEY=...
```

Next.js App Router is used for both frontend and API routes in a single repo, deployed on Railway.

---

## Milestones (Phase 1 + Phase 2)

### Milestone 0 — Foundation (1–2 short sessions)

**Goal**: App boots, PWA installable, proxy routes reachable.

**Deliverables**:

- Next.js app deployed on Railway
- PWA manifest + icons + service worker (basic app shell cache)
- `/api/health` route
- Rebrickable proxy wired with env var

**Acceptance**:

- Can install on iPad ("Add to Home Screen")
- API health returns OK
- No Rebrickable key exposed in client bundle

---

### Milestone 1 — Add Set (Search) (Phase 1)

**Goal**: Search sets and add one to your library.

**User flow**: Library → "Add set" → search → tap result → set saved

**Acceptance**:

- Search by set number or text
- Results show image, set name, set number
- Selecting a set stores it in IndexedDB
- Library list persists across reload

---

### Milestone 2 — Set Checklist (Inventory + counters) (Phase 1)

**Goal**: Open a set and do the "collect parts" counting.

**User flow**: Library → open set → inventory list → increment found → hide completed

**Acceptance**:

- Inventory loads (from proxy, cached locally)
- Each part row shows:
  - image thumbnail
  - part name (or part num if name missing)
  - color name
  - needed qty
  - found stepper (+/–)
  - "Hide completed" toggle
- Progress persists locally (close/reopen app)

---

### Milestone 3 — Library polish (Phase 2)

**Goal**: Your sets library becomes usable day-to-day.

**Acceptance**:

- Library shows progress summary (e.g., % complete + counts)
- Sort: last opened
- Remove set from library (with confirm)
- "Refresh inventory" button (re-fetch + keep progress)

---

## Technical Design (Locked)

### Proxy API Routes (server-side)

- `GET /api/sets/search?q=...`
- `GET /api/sets/:setNum`
- `GET /api/sets/:setNum/parts`

**Responsibilities**:

- Attach Authorization: key … (or whatever Rebrickable expects)
- Map Rebrickable response → your simplified DTO (keeps payload smaller)
- Add caching headers (at least s-maxage, stale-while-revalidate) for set/inventory endpoints

### Client-side Caching Rules

- Always store:
  - sets (library)
  - inventories[setNum]
  - progress[setNum]
- Strategy:
  - Prefer cached inventory if present
  - Allow "Refresh inventory" to update cache

### IDs / Keys for Progress

- Key each row by: `partNum + colorId`
- Store:
  - `neededQty`
  - `foundQty`

This keeps progress stable even if inventory ordering changes.

---

## Initial Backlog (Tickets for Dev 1 in Cursor)

### Ticket 001 — Scaffold Next.js + basic UI shell (Done)

**Scope**:

- Next.js + TS
- Home route: Library placeholder
- Basic layout components

**Acceptance**:

- App loads on desktop + iPad Safari

---

### Ticket 002 — PWA setup (Done)

**Scope**:

- manifest, icons, theme color
- service worker app-shell caching (basic)

**Acceptance**:

- "Add to Home Screen" works and launches full-screen

---

### Ticket 003 — Vercel API proxy: health + Rebrickable wrapper (Done)

**Scope**:

- `/api/health`
- `/api/sets/search`
- env var `REBRICKABLE_API_KEY`

**Acceptance**:

- Search endpoint returns results without exposing key

---

### Ticket 004 — Dexie DB schema (Done)

**Scope**:
Tables:

- sets
- inventories
- progress

**Acceptance**:

- Can add/read sets locally

---

### Ticket 005 — Set Search UI + Add to Library (Done)

**Scope**:

- Search page/modal
- Results list
- Add set

**Acceptance**:

- Set appears in Library after add, persists reload

---

### Ticket 006 — Set detail checklist (Done)

**Scope**:

- Inventory fetch
- Render list
- Stepper counters (+/–)
- Hide completed

**Acceptance**:

- Counters persist, toggle works

---

### Ticket 007 — Library progress summary + remove (Done)

**Scope**:

- Progress % per set
- Remove set

**Acceptance**:

- Removing deletes inventory + progress too

---

### Ticket 008 — Add Auth (Auth.js) (Done)

**Scope**:

- Google provider
- NEXTAUTH_SECRET env var
- Protected routes for library/progress

**Acceptance**:

- Users can sign in with Google
- Library and progress routes require authentication

---

### Ticket 009 — Add Postgres + Prisma (Done)

**Scope**:

- Connect Postgres (Railway plugin or external)
- Prisma schema + migration

**Acceptance**:

- Database connection established
- Schema defined and migrated

---

### Ticket 010 — Sync library to DB (Done)

**Scope**:

- On login: load library from DB
- Add set: write to DB + local cache
- Remove set: delete from DB + local cache

**Acceptance**:

- Library syncs between devices
- Changes persist to database

---

### Ticket 011 — Sync progress to DB (Done)

**Scope**:

- Save found counters per set to DB
- Offline queue (optional v1.1)

**Acceptance**:

- Progress syncs between devices
- Changes persist to database

---

### Ticket 012 — Parts filter & sort controls (Set Checklist) (Done)

**Goal**:

On the set checklist screen, let me:

- Filter by color
- Sort by:
  1. Color
  2. Parts remaining (needed − found)
  3. Part number

This must work with Hide completed (and play nicely with it).

**Scope**:

**UI**:

- Add a compact controls bar (sticky is fine) with:
  - Color filter (dropdown/select)
  - Default: All colors
  - Options generated from the current set inventory
  - Include a count per color (optional but nice): "Red (12)"
  - Sort selector (segmented control or dropdown)
    - "Color"
    - "Remaining"
    - "Part #"
  - Sort direction toggle (optional, but recommended)
    - Asc / Desc

**Behavior**:

- Filtering is applied before sorting.
- Hide completed (if enabled) is applied before filter/sort (recommended), or after — just be consistent.
- "Parts remaining" is max(neededQty - foundQty, 0).

**Acceptance Criteria**:

**Filter by color**:

- When selecting a color, only parts with that colorId are shown.
- "All colors" restores the full list.
- The list updates immediately without refetching.

**Sort modes**:

- Sort by Color:
  - Primary: colorName (or colorId if name missing)
  - Secondary: partNum
- Sort by Parts Remaining:
  - Primary: remaining (desc by default)
  - Secondary: colorName
  - Tertiary: partNum
- Sort by Part Number:
  - Primary: partNum (string compare is OK, numeric if you already parse)
  - Secondary: colorName

**Persistence**:

- The chosen filter/sort settings persist per set:
  - Either in local storage / Dexie progress record (preferred)
  - Or at least in memory for v1 (but persistence is strongly preferred)

**Performance**:

- Works smoothly on iPad with large inventories (no noticeable lag).
- Use memoization (useMemo) for filtered/sorted rows.

---

### Ticket 013 — Group parts list by color (collapsible sections) (Done)

**Goal**:

On the set checklist screen, add a "grouped" display mode that groups parts into color sections, iOS-Settings-style, with the ability to collapse/expand each color.

This complements Ticket 012 (filter/sort) and makes browsing huge sets way easier.

**Scope**:

**UI**:

- Add a view toggle (simple for v1):
  - "List" (current)
  - "Grouped" (new)
- In Grouped mode:
  - Inventory is grouped by colorId
  - Each group has a sticky-ish header (optional) or standard header row:
    - Color name
    - Count summary like: remaining/needed or X items
    - Collapse/expand chevron
- Inside each section:
  - Show the same part rows you already have (thumbnail, needed, found stepper, etc.)

**Behavior**:

- "Hide completed" applies inside groups:
  - If hide completed is ON and a part becomes complete, it disappears from that group.
  - If hide completed is ON and a group becomes empty:
    - Either hide the group entirely (recommended)
    - Or show it with "0 remaining" (optional)

**Interactions**:

- Tapping a group header toggles collapse
- Add "Expand all / Collapse all" (optional but nice)

**Acceptance Criteria**:

**Group rendering**:

- Parts are grouped by color consistently.
- Each color section shows correct parts and totals.

**Collapse state**:

- Each group can be expanded/collapsed.
- Collapse state persists per set (preferred):
  - Stored alongside checklist preferences (Dexie progress/settings)

**Compatibility with Ticket 012**:

- Color filter still works in grouped mode:
  - If user filters to a single color, show only that group.
- Sort behavior in grouped mode:
  - Within a group, default sort is Part Number (or whatever current sortKey is)
  - Group order can follow current sortKey if it makes sense:
    - If sortKey = color → groups in color order
    - If sortKey = remaining → groups ordered by group remaining total (optional; v1 can keep color order)

**Performance**:

- Smooth on iPad for large inventories:
  - Use memoization for grouping
  - Avoid regrouping on every keystroke/counter change if possible (derive efficiently)

**Implementation Notes (Dev 1)**:

**Derived data**:

For each color group:

- groupNeededTotal
- groupFoundTotal
- groupRemainingTotal
- items[] parts rows

**Group key**:

- colorId

**Group label**:

- colorName (fallback to Color #${colorId})

**Persisted settings per set (extend Ticket 012)**:

- viewMode: "list" | "grouped"
- collapsedColorIds: number[] (or a map {[colorId]: boolean})

**Test Cases**:

- Toggle List ↔ Grouped view doesn't reset scroll or state (best effort)
- Collapse a color group → remains collapsed after refresh
- Hide completed ON:
  - Completing parts reduces group totals
  - Empty groups disappear (if you choose that behavior)
- Filter to "Red" in grouped mode → only red section remains

---

## Eventual / Future Tickets

### Ticket 014 — Rebrickable sync (Done)

**Scope**:

- "Import from Rebrickable"
- Either: paste token (API call server-side) or paste set list
- De-dupe with (userId, setNum) unique

**Acceptance**:

- Users can import their Rebrickable sets
- Duplicate sets are handled correctly

---

## Suggested Next Tickets

### Ticket 015 — Auth + session robustness (Done)

**Scope**:

- Standardize env vars in docs + env.example
- Add a friendly auth error screen for misconfig (missing client id/secret)
- Ensure auth routes are `dynamic = "force-dynamic"`

**Acceptance**:

- Local auth works with the documented env vars
- Missing envs return a readable message instead of 500

---

### Ticket 016 — Sync reliability + conflict handling (v1) (Done)

**Scope**:

- Queue offline changes in Dexie when API calls fail
- On reconnect/login, replay pending changes in order
- Resolve simple conflicts by last-write-wins per part

**Acceptance**:

- Progress changes made offline sync correctly
- No data loss when flipping between devices

---

### Ticket 017 — Set checklist performance pass (Done)

**Scope**:

- Memoize heavy derived data (filters/sorts/grouping)
- Add windowing/virtualization for large inventories (if needed)
- Defer image loading (lazy + sizes)

**Acceptance**:

- Smooth scroll and interactions on large sets (iPad)

---

### Ticket 018 — Server DB helpers + indexes audit (Done)

**Scope**:

- Ensure `lib/db/*` helpers exist for all routes
- Add/verify indexes for `userId` and composite lookups
- Add `ensureUser` usage checks in all DB routes

**Acceptance**:

- All DB routes use `ensureUser` and `user.id`
- Prisma schema has indexes for common queries

---

### Ticket 019 — Observability and error reporting (Done)

**Scope**:

- Add structured logging for API routes:
  - request id
  - user id (if available)
  - route + status + duration
- Normalize error responses in API handlers (shape + error code)
- Add a lightweight error boundary UI for the app
- Capture client errors with context (route, setNum, last action) in dev logs

**Acceptance**:

- Errors are actionable locally and on Railway logs
- API error payloads are consistent across routes

---

### Ticket 020 — Basic test coverage (smoke) (Done)

**Scope**:

- Add minimal tests for:
  - set search
  - add to library
  - checklist increment/decrement
  - sync endpoints
- Prefer fast, deterministic tests (no external Rebrickable calls)

**Acceptance**:

- CI can run tests in < 1 minute
- Core flows have at least one automated check each

---

### Ticket 021 — Localization support (Done)

**Scope**:

- Add i18n framework setup (routing + message catalogs)
- Externalize all user-facing strings
- Add a baseline locale (en) and one additional locale for testing

**Acceptance**:

- App loads with localized strings based on locale
- No hardcoded UI strings remain in core screens

---

### Ticket 022 — Include minifigs in parts list (Done)

**Scope**:

- Ensure minifigs are fetched and displayed alongside parts in set inventories
- Identify if Rebrickable endpoint or mapping skips minifigs
- Update caching and progress logic to include minifigs

**Acceptance**:

- Minifigs show in the checklist for sets that include them
- Progress tracking works for minifigs the same as parts

---

### Ticket 023 — Question/comment popup (Done)

**Scope**:

- Add a lightweight "?" help button in the checklist and library screens
- Popover includes:
  - short usage tips
  - link to report an issue or ask a question (email or form)
- Persist "dismissed" state per device

**Acceptance**:

- Users can access help quickly without leaving the flow

---

### Ticket 024 — Sets page search/sort/filter bar (Done)

**Scope**:

- Add a compact search/sort/filter bar on the Sets (Library) page
- Search by set name or set number (client-side)
- Sort by:
  - last opened
  - name
  - parts count
- Filter toggles:
  - Ongoing only
  - Hide completed (if progress available)
- Add theme support for sets:
  - Store/display theme name (show next to year)
  - Enable filter by theme in the library bar
- Persist selections in local storage

**Acceptance**:

- Users can search, sort, and filter their library without refetching
- Theme appears beside year and can be used to filter
- Selections persist across reloads

---

### Ticket 025 — Proxy + auth route rate limiting (Done)

**Scope**:

- Add lightweight rate limiting to Rebrickable proxy routes
- Add basic throttling for auth endpoints (if needed)
- Document expected limits

**Acceptance**:

- Proxy routes are protected against accidental abuse

---

### Ticket 026 — Auth/session coverage audit (Done)

**Scope**:

- Ensure all DB routes require auth and use `ensureUser`
- Verify middleware rules match intended access controls
- Add a small checklist to AGENTS.md

**Acceptance**:

- No unauthenticated access to user data routes

---

### Ticket 027 — Cache headers and invalidation (Done)

**Scope**:

- Define cache headers for Rebrickable proxy routes
- Clarify when to revalidate inventories
- Add a “Refresh inventory” policy note

**Acceptance**:

- Cache behavior is documented and consistent

---

### Ticket 028 — Offline and sync UX (Done)

**Scope**:

- Add an offline indicator
- Add “syncing / failed” status for queued changes
- Add a manual retry action

**Acceptance**:

- Users can see when data is offline or unsynced

---

### Ticket 029 — Accessibility pass (Done)

**Scope**:

- Verify tap targets meet 44px minimum
- Add visible focus states for keyboard use
- Respect `prefers-reduced-motion`

**Acceptance**:

- Accessibility checklist completed for core screens

---

### Ticket 030 — Dexie + Prisma migration strategy (Done)

**Scope**:

- Document Dexie schema versioning rules
- Add a migration checklist for Prisma changes (dev + prod)
- Include a "breaking change" protocol for cached data

**Acceptance**:

- Clear, documented path for evolving client and server schemas

---

### Ticket 031 — Building instructions PDF viewer (Abandoned)

**Goal**:

Display links to building instructions (PDFs) for a set, and open the PDF full-screen in a reader to flip pages.

**Scope**:

- Fetch and display instruction links for a set
  - Use Rebrickable instructions endpoint (server-side proxy)
  - Show PDF-only links in the UI
- Add an “Instructions” control in the set detail header
  - Use a dropdown to list available PDFs (label by filename or description)
  - If multiple PDFs, list them all in the dropdown
- On tap, open a full-screen PDF reader
  - Supports page flipping
  - Works on iPad Safari and desktop

**Acceptance**:

- Instruction PDFs are visible in the header when available for a set
- If multiple PDFs exist, the dropdown shows each PDF option
- Tapping a link opens the PDF in a full-screen reader
- Users can flip pages smoothly

---

### Ticket 032 — Global Rebrickable cache (Done)

**Goal**:

Reduce Rebrickable API calls by caching set details and inventories in the database.

**Scope**:

- Add global cache tables for set details and inventories (parts + minifigs)
- Cache is public (no auth required to read)
- Read-through cache on `GET /api/sets/[setNum]` and `GET /api/sets/[setNum]/parts`
- Support `?refresh=true` to bypass cache and re-fetch from Rebrickable
- TTL set to 7 days
- Cache failures should not break API responses

**Acceptance**:

- Cache is used when fresh, otherwise Rebrickable is queried
- Cached records are updated after successful Rebrickable fetches
- `?refresh=true` always re-fetches and updates cache

---

### Ticket 033 — Debugging helpers and env toggles (Done)

**Goal**:

Make local and staging debugging easier with explicit, controllable toggles.

**Scope**:

- Add env-driven debug flags for client and server logging
  - Example: `NEXT_PUBLIC_DEBUG_UI`, `DEBUG_API`, `DEBUG_DB`
- Gate any debug UI (e.g., DebugPanel) behind an env flag
- Add a small diagnostics summary (env-safe) to help verify config
  - Example: show which optional debug flags are enabled
- Document the debug flags in `env.example` and AGENTS.md

**Acceptance**:

- Debug logging/UI is disabled by default
- Setting env flags enables extra logging without code changes
- Debug helpers never run in production unless explicitly enabled

---

### Ticket 034 — Hidden sets category + filter toggle (Done)

**Goal**:

Allow users to hide sets from the main library views while keeping them in the account.

**Scope**:

- Add a `hidden` category in the sets view alongside "Ongoing" and "My Sets"
- Add a filter toggle to show/hide hidden sets
- Persist hidden status per set (offline-first + DB sync)
- Hidden sets should be excluded from default views unless the toggle is enabled
- Update any counts/summary UI to reflect hidden state

**Acceptance**:

- Users can mark a set as hidden/unhidden
- Hidden sets move to the "Hidden" category
- Filter toggle reveals/hides hidden sets without losing data
- Hidden state persists across devices after sync

---

### Ticket 035 — Migrate deployment to Railway (Done)

**Goal**:

Move the Brickly deployment from Vercel to Railway with equivalent functionality and reliable CI/CD.

**Scope**:

- **Railway project setup**:
  - Create a new Railway project and connect the GitHub repo
  - Configure build and start commands (`npm install`, `npm run build`, `npm run start`)
  - Set Node version and region as needed
- **Environment variables**:
  - Migrate all required env vars (Rebrickable, Auth, DB, debug flags)
  - Ensure `AUTH_URL` / `NEXTAUTH_URL` are updated to the Railway domain
  - Validate secrets are set for production and preview environments
- **Database migration**:
  - Provision Postgres on Railway (or connect existing external DB)
  - Update `DATABASE_URL` / `PRISMA_DATABASE_URL`
  - Run `prisma migrate deploy` on Railway
- **Static assets + PWA**:
  - Confirm service worker, manifest, and icons are served correctly
  - Validate caching headers and offline behavior
- **API + Auth**:
  - Verify all API routes function (proxy, auth, sync)
  - Update OAuth redirect URIs for Google to Railway domain
  - Validate session cookies and callback URLs
- **Observability**:
  - Confirm logs are visible in Railway
  - Ensure error reporting still works (if configured)
- **Cutover plan**:
  - Confirm production domain and redirect strategy
  - Update docs to reference Railway domain instead of Vercel
  - Follow `docs/RAILWAY_DEPLOY.md` for the detailed steps

**Acceptance**:

- App builds and runs on Railway
- All env vars and OAuth callbacks work on Railway domain
- Database migrations run successfully in Railway
- PWA features and proxy routes behave the same as Vercel
- Deployment steps are documented in `README.md` (or a new Railway section)
- `docs/RAILWAY_DEPLOY.md` exists and is kept up to date

---

### Ticket 036 — Railway DB setup + migration (Done)

**Goal**:

Set up the production database on Railway and migrate the schema safely.

**Scope**:

- Provision Railway Postgres (or confirm external DB usage)
- Configure `DATABASE_URL` and `PRISMA_DATABASE_URL`
- Validate connection with `/api/db-check`
- Run `prisma migrate deploy` during Railway deploy
- Verify Prisma Client generation in build pipeline
- Confirm indexes and migrations are in sync with `prisma/schema.prisma`
- Document the exact Railway DB setup steps in `docs/RAILWAY_DEPLOY.md`

**Acceptance**:

- Railway DB is provisioned and reachable
- Migrations apply successfully on Railway
- App reads/writes data without errors
- `docs/RAILWAY_DEPLOY.md` includes the DB setup + migration steps

**Implementation Notes**:

- Enhanced `docs/RAILWAY_DEPLOY.md` with detailed database setup steps
- Added Railway Postgres provisioning instructions (Option A)
- Added external Postgres setup instructions (Option B)
- Documented automatic migration process via `railway.toml`
- Added manual migration steps for troubleshooting
- Included index verification section listing all required indexes
- Added Prisma Client generation verification steps
- Enhanced verification checklist with database-specific checks
- Added comprehensive troubleshooting section for common DB issues

---

### Ticket 037 — Additional auth providers (Done)

**Goal**:

Offer more sign-in options beyond Google.

**Scope**:

- Add Apple and Email providers
- Apple requirements:
  - Apple Developer account with Sign in with Apple enabled
  - Service ID + redirect URL configured in Apple Developer console
  - Team ID
  - Key ID + private key (.p8)
  - Client ID (the Service ID)
- Email (magic link) requirements:
  - SMTP provider credentials (host, port, user, password)
  - Sender address (from)
  - Optional: email verification template customization
- Update env docs with required variables
  - Apple:
    - `AUTH_APPLE_ID`
    - `AUTH_APPLE_TEAM_ID`
    - `AUTH_APPLE_KEY_ID`
    - `AUTH_APPLE_PRIVATE_KEY`
  - Email:
    - `AUTH_EMAIL_SERVER`
    - `AUTH_EMAIL_FROM`
- Update the sign-in UI to show multiple provider buttons
- Ensure provider configuration is documented in env examples
- Keep existing Google login working

**Acceptance**:

- Users can sign in with at least one non-Google provider
- Sign-in page lists available providers clearly
- Missing provider env vars show a friendly message instead of 500

---

### Ticket 038 — Home progress bar visibility fixes (Done)

**Goal**:

Make the home progress bar reliable and avoid showing it when progress is zero.

**Scope**:

- Fix progress bar on the home/library tiles so it renders even if a set hasn't been opened yet
- Suppress the progress bar on tiles when `foundQty` is 0
- Ensure progress computation uses persisted progress data (not only "last opened" state)
- Update any related selectors/helpers if needed

**Acceptance**:

- Home tiles show a progress bar when progress > 0 even if the set hasn't been opened
- Home tiles never show a progress bar when progress is 0

---

### Ticket 039 — Multi-device progress conflict handling audit

**Goal**:

Understand and improve sync conflict behavior when multiple devices update the same set concurrently.

**Scope**:

- Review current sync + conflict resolution for set progress across devices
- Identify scenarios where updates are lost or overwrite newer progress
- Define a conflict policy (e.g., last-write-wins, per-part max, merge with timestamps)
- Add logging/telemetry to detect conflicts in the field
- Update docs to describe the conflict strategy

**Acceptance**:

- Conflict behavior is documented and repeatable
- Known conflict scenarios have a defined and tested outcome
- Sync does not regress on single-device flows

---

### Ticket 040 — Remove Prisma (temporary) (Done)

**Goal**:

Temporarily remove Prisma usage to unblock Railway builds and reduce operational complexity.

**Scope**:

- Remove Prisma client initialization from runtime path
- Remove Prisma migrations from build pipeline
- Replace DB-backed features with safe fallbacks (read-only or disabled)
- Update environment variable requirements (remove `PRISMA_DATABASE_URL`)
- Ensure app still runs with offline/Dexie-only mode
- Document the limitations while Prisma is removed

**Acceptance**:

- App builds on Railway without Prisma errors
- No runtime attempts to access Prisma
- UI clearly handles disabled sync/DB features
- Docs updated to reflect temporary removal

**Implementation Notes**:

- Modified `lib/prisma.ts` to return null instead of initializing PrismaClient
- Updated all DB helper functions (`lib/db/*`) to return safe fallbacks:
  - `getUserSets()` returns empty array
  - `getUserProgress()` returns empty array
  - `addSetToDB()`, `saveProgressToDB()`, etc. are no-ops
  - `ensureUser()` returns mock user object
- Removed Prisma migrations from `railway.toml` build command
- Removed `prisma generate` from `package.json` build and postinstall scripts
- Updated API routes to handle Prisma removal gracefully
- Updated `/api/db-check` to return safe response indicating Prisma is disabled
- Updated documentation (AGENTS.md, README.md) to reflect temporary removal
- App now runs in offline/Dexie-only mode - all data stored locally in IndexedDB
- Multi-device sync is temporarily disabled until Prisma is re-enabled

---
