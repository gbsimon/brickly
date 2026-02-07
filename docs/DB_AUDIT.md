# Database Helpers & Indexes Audit

**Note:** Prisma has been removed. Database access uses the `postgres` client. Prisma-related notes below are historical.

## Ticket 018 - Server DB helpers + indexes audit

### API Routes Audit

#### Routes Using Database (All use `ensureUser` ✅)

1. **POST `/api/sets`**
   - ✅ Uses `ensureUser`
   - ✅ Uses `addSetToDB` helper
   - ✅ Uses `user.id` (not `session.user.id`)

2. **DELETE `/api/sets/[setNum]`**
   - ✅ Uses `ensureUser`
   - ✅ Uses `removeSetFromDB` helper
   - ✅ Uses `user.id` (not `session.user.id`)

3. **GET `/api/sets/[setNum]/progress`**
   - ✅ Uses `ensureUser`
   - ✅ Uses `getUserProgress` helper
   - ✅ Uses `user.id` (not `session.user.id`)

4. **POST `/api/sets/[setNum]/progress`**
   - ✅ Uses `ensureUser`
   - ✅ Uses `saveProgressToDB` / `bulkSaveProgressToDB` helpers
   - ✅ Uses `user.id` (not `session.user.id`)

5. **PATCH `/api/sets/[setNum]/ongoing`**
   - ✅ Uses `ensureUser`
   - ✅ Uses `toggleSetOngoing` helper
   - ✅ Uses `user.id` (not `session.user.id`)

6. **GET `/api/sets/sync`**
   - ✅ Uses `ensureUser`
   - ✅ Uses `getUserSets` helper
   - ✅ Uses `user.id` (not `session.user.id`)

#### Routes NOT Using Database (Rebrickable Proxy / System Routes)

- `GET /api/sets/[setNum]` - Rebrickable proxy (no DB access)
- `GET /api/sets/[setNum]/parts` - Rebrickable proxy (no DB access)
- `GET /api/sets/search` - Rebrickable proxy (no DB access)
- `GET /api/health` - Health check (no DB access)
- `GET /api/db-check` - DB connection check (no DB access)
- `GET /api/auth/check` - Auth config check (no DB access)
- `GET/POST /api/auth/[...nextauth]` - Auth handler (no direct DB access)

### Database Helpers (`lib/db/*`)

#### `lib/db/users.ts`
- ✅ `ensureUser(userId, email?, name?, image?)` - Ensures user exists, handles email conflicts

#### `lib/db/sets.ts`
- ✅ `getUserSets(userId)` - Get all sets for a user
- ✅ `addSetToDB(userId, set)` - Add/upsert a set
- ✅ `removeSetFromDB(userId, setNum)` - Remove a set (cascades to inventory/progress)
- ✅ `updateSetLastOpened(userId, setNum)` - Update lastOpenedAt timestamp
- ✅ `toggleSetOngoing(userId, setNum, isOngoing)` - Toggle ongoing status

#### `lib/db/progress.ts`
- ✅ `getUserProgress(userId, setNum)` - Get all progress for a set
- ✅ `saveProgressToDB(userId, progressData)` - Save/update single progress record
- ✅ `bulkSaveProgressToDB(userId, progressArray)` - Bulk save progress records

**All routes that need DB access have corresponding helpers ✅**

### Prisma Schema Indexes

#### User Model
- ✅ Primary key: `id`
- ✅ Unique: `email`

#### Set Model
- ✅ Primary key: `[userId, setNum]` (composite)
- ✅ Index: `[userId]` - For querying all sets by user
- ✅ Index: `[userId, lastOpenedAt]` - For sorting by last opened
- ✅ Index: `[userId, isOngoing]` - For filtering ongoing sets

#### Inventory Model
- ✅ Primary key: `[userId, setNum]` (composite)
- ⚠️ No separate `userId` index (but composite PK covers it)
- **Note**: Inventory is typically accessed via Set relation, so separate index may not be needed

#### Progress Model
- ✅ Primary key: `id` (UUID)
- ✅ Unique: `[userId, setNum, partNum, colorId, isSpare]` - Ensures one progress record per part
- ✅ Index: `[userId, setNum]` - For querying all progress for a set

### Summary

✅ **All DB routes use `ensureUser` and `user.id`**
✅ **All DB operations use helpers from `lib/db/*`**
✅ **Prisma schema has appropriate indexes for common queries**

### Recommendations

1. **Inventory Model**: Consider adding `@@index([userId])` if we need to query all inventories for a user independently (currently accessed via Set relation, so not critical)

2. **Progress Model**: Current indexes are sufficient for all query patterns

3. **Set Model**: All common query patterns are covered by existing indexes
