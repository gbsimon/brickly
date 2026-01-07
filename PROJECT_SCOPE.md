# BrickByBrick - Project Scope

## Project Setup Decisions (Locked)

- **App**: PWA (iPad-first)
- **Hosting**: Vercel
- **Backend**: Vercel Serverless Functions as a Rebrickable proxy (hide API key + caching)
- **Frontend**: Vite + React + TS (or Next.js App Router if you prefer)
  - Since you're on Vercel and want serverless routes anyway, I recommend Next.js to simplify everything (PWA + API routes in one repo).
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
├── app/api/ (Vercel serverless functions)
│   ├── sets/search/route.ts
│   ├── sets/[setNum]/route.ts
│   └── sets/[setNum]/parts/route.ts
├── .env.local
│   └── REBRICKABLE_API_KEY=...
```

If you strongly prefer Vite over Next, we can still do it (Vite frontend + /api/\* serverless folder), but Next is the smoothest on Vercel.

---

## Milestones (Phase 1 + Phase 2)

### Milestone 0 — Foundation (1–2 short sessions)

**Goal**: App boots, PWA installable, proxy routes reachable.

**Deliverables**:

- Next.js app deployed on Vercel
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

### Proxy API Routes (server-side on Vercel)

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

### Ticket 001 — Scaffold Next.js + basic UI shell

**Scope**:

- Next.js + TS
- Home route: Library placeholder
- Basic layout components

**Acceptance**:

- App loads on desktop + iPad Safari

---

### Ticket 002 — PWA setup

**Scope**:

- manifest, icons, theme color
- service worker app-shell caching (basic)

**Acceptance**:

- "Add to Home Screen" works and launches full-screen

---

### Ticket 003 — Vercel API proxy: health + Rebrickable wrapper

**Scope**:

- `/api/health`
- `/api/sets/search`
- env var `REBRICKABLE_API_KEY`

**Acceptance**:

- Search endpoint returns results without exposing key

---

### Ticket 004 — Dexie DB schema

**Scope**:
Tables:

- sets
- inventories
- progress

**Acceptance**:

- Can add/read sets locally

---

### Ticket 005 — Set Search UI + Add to Library

**Scope**:

- Search page/modal
- Results list
- Add set

**Acceptance**:

- Set appears in Library after add, persists reload

---

### Ticket 006 — Set detail checklist

**Scope**:

- Inventory fetch
- Render list
- Stepper counters (+/–)
- Hide completed

**Acceptance**:

- Counters persist, toggle works

---

### Ticket 007 — Library progress summary + remove

**Scope**:

- Progress % per set
- Remove set

**Acceptance**:

- Removing deletes inventory + progress too

---

### Ticket 008 — Add Auth (Auth.js)

**Scope**:

- Google provider
- NEXTAUTH_SECRET env var
- Protected routes for library/progress

**Acceptance**:

- Users can sign in with Google
- Library and progress routes require authentication

---

### Ticket 009 — Add Postgres + Prisma

**Scope**:

- Connect Vercel Postgres (or external Postgres)
- Prisma schema + migration

**Acceptance**:

- Database connection established
- Schema defined and migrated

---

### Ticket 010 — Sync library to DB

**Scope**:

- On login: load library from DB
- Add set: write to DB + local cache
- Remove set: delete from DB + local cache

**Acceptance**:

- Library syncs between devices
- Changes persist to database

---

### Ticket 011 — Sync progress to DB

**Scope**:

- Save found counters per set to DB
- Offline queue (optional v1.1)

**Acceptance**:

- Progress syncs between devices
- Changes persist to database

---

### Ticket 012 — Parts filter & sort controls (Set Checklist)

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

### Ticket 013 — Group parts list by color (collapsible sections)

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

### Ticket 014 — Rebrickable sync

**Scope**:

- "Import from Rebrickable"
- Either: paste token (API call server-side) or paste set list
- De-dupe with (userId, setNum) unique

**Acceptance**:

- Users can import their Rebrickable sets
- Duplicate sets are handled correctly

---

## Suggested Next Tickets

### Ticket 015 — Auth + session robustness

**Scope**:

- Standardize env vars in docs + env.example
- Add a friendly auth error screen for misconfig (missing client id/secret)
- Ensure auth routes are `dynamic = "force-dynamic"`

**Acceptance**:

- Local auth works with the documented env vars
- Missing envs return a readable message instead of 500

---

### Ticket 016 — Sync reliability + conflict handling (v1)

**Scope**:

- Queue offline changes in Dexie when API calls fail
- On reconnect/login, replay pending changes in order
- Resolve simple conflicts by last-write-wins per part

**Acceptance**:

- Progress changes made offline sync correctly
- No data loss when flipping between devices

---

### Ticket 017 — Set checklist performance pass

**Scope**:

- Memoize heavy derived data (filters/sorts/grouping)
- Add windowing/virtualization for large inventories (if needed)
- Defer image loading (lazy + sizes)

**Acceptance**:

- Smooth scroll and interactions on large sets (iPad)

---

### Ticket 018 — Server DB helpers + indexes audit

**Scope**:

- Ensure `lib/db/*` helpers exist for all routes
- Add/verify indexes for `userId` and composite lookups
- Add `ensureUser` usage checks in all DB routes

**Acceptance**:

- All DB routes use `ensureUser` and `user.id`
- Prisma schema has indexes for common queries

---

### Ticket 019 — Observability and error reporting

**Scope**:

- Add structured logging for API routes:
  - request id
  - user id (if available)
  - route + status + duration
- Normalize error responses in API handlers (shape + error code)
- Add a lightweight error boundary UI for the app
- Capture client errors with context (route, setNum, last action) in dev logs

**Acceptance**:

- Errors are actionable locally and on Vercel logs
- API error payloads are consistent across routes

---

### Ticket 020 — Basic test coverage (smoke)

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

### Ticket 021 — Dexie + Prisma migration strategy

**Scope**:

- Document Dexie schema versioning rules
- Add a migration checklist for Prisma changes (dev + prod)
- Include a “breaking change” protocol for cached data

**Acceptance**:

- Clear, documented path for evolving client and server schemas

---

### Ticket 022 — Proxy + auth route rate limiting

**Scope**:

- Add lightweight rate limiting to Rebrickable proxy routes
- Add basic throttling for auth endpoints (if needed)
- Document expected limits

**Acceptance**:

- Proxy routes are protected against accidental abuse

---

### Ticket 023 — Auth/session coverage audit

**Scope**:

- Ensure all DB routes require auth and use `ensureUser`
- Verify middleware rules match intended access controls
- Add a small checklist to AGENTS.md

**Acceptance**:

- No unauthenticated access to user data routes

---

### Ticket 024 — Cache headers and invalidation

**Scope**:

- Define cache headers for Rebrickable proxy routes
- Clarify when to revalidate inventories
- Add a “Refresh inventory” policy note

**Acceptance**:

- Cache behavior is documented and consistent

---

### Ticket 025 — Offline and sync UX

**Scope**:

- Add an offline indicator
- Add “syncing / failed” status for queued changes
- Add a manual retry action

**Acceptance**:

- Users can see when data is offline or unsynced

---

### Ticket 026 — Accessibility pass

**Scope**:

- Verify tap targets meet 44px minimum
- Add visible focus states for keyboard use
- Respect `prefers-reduced-motion`

**Acceptance**:

- Accessibility checklist completed for core screens

---

### Ticket 027 — Question/comment popup

**Scope**:

- Add a lightweight “?” help button in the checklist and library screens
- Popover includes:
  - short usage tips
  - link to report an issue or ask a question (email or form)
- Persist “dismissed” state per device

**Acceptance**:

- Users can access help quickly without leaving the flow

---

### Ticket 028 — Localization support

**Scope**:

- Add i18n framework setup (routing + message catalogs)
- Externalize all user-facing strings
- Add a baseline locale (en) and one additional locale for testing

**Acceptance**:

- App loads with localized strings based on locale
- No hardcoded UI strings remain in core screens
