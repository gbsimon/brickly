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

### Ticket 012 — Rebrickable sync

**Scope**:

- "Import from Rebrickable"
- Either: paste token (API call server-side) or paste set list
- De-dupe with (userId, setNum) unique

**Acceptance**:

- Users can import their Rebrickable sets
- Duplicate sets are handled correctly
