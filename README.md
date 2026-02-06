# Brickly

An iPad-first PWA to help rebuild LEGO sets by checking off parts from an inventory list. Track your collection, manage progress, and sync across devices.

## Features

- 🔍 **Search Sets** - Search and add LEGO sets from Rebrickable
- 📦 **Inventory Management** - View parts and minifigs for each set
- ✅ **Progress Tracking** - Track found parts with increment/decrement counters
- 🎨 **Filter & Sort** - Filter by color, sort by remaining parts, part number, or color
- 📱 **Offline Support** - Works offline with local IndexedDB cache
- 🔄 **Multi-Device Sync** - Sync your library and progress across devices
- 🌍 **Localization** - English and French support
- ♿ **Accessible** - WCAG 2.1 AA compliant with keyboard navigation support

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Custom SCSS with iOS-like design system
- **PWA**: Service worker + manifest for offline support
- **Backend**: Next.js API routes, Vercel Serverless Functions
- **Database**: Vercel Postgres + Prisma (server), Dexie/IndexedDB (client)
- **Auth**: NextAuth.js v5 (Auth.js) with Google OAuth
- **Localization**: next-intl

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Rebrickable API key ([Get one here](https://rebrickable.com/api/))
- Google OAuth credentials (for authentication)
- PostgreSQL database (Vercel Postgres recommended)

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd Brickly
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:

   ```bash
   cp env.example .env.local
   ```

4. **Configure `.env.local`**:

   ```env
   # Rebrickable API
   REBRICKABLE_API_KEY=your_api_key_here

   # Authentication (NextAuth.js)
   AUTH_GOOGLE_ID=your_google_client_id
   AUTH_GOOGLE_SECRET=your_google_client_secret
   NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
   AUTH_URL=http://localhost:3000
   NEXTAUTH_URL=http://localhost:3000
   AUTH_TRUST_HOST=true  # For local development

   # Database
   DATABASE_URL=your_postgres_connection_string
   PRISMA_DATABASE_URL=your_prisma_accelerate_url  # Required in production
   ```

5. **Set up the database**:

   ```bash
   # Generate Prisma Client
   npm run db:generate

   # Run migrations
   npm run db:migrate
   ```

6. **Run the development server**:

   ```bash
   npm run dev
   ```

7. **Open** [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
Brickly/
├── app/                    # Next.js App Router
│   ├── [locale]/          # Localized routes (en, fr)
│   │   ├── auth/          # Authentication pages
│   │   └── sets/          # Set detail pages
│   └── api/               # API routes
│       ├── auth/          # Auth endpoints
│       ├── sets/          # Set operations
│       └── health/        # Health checks
├── components/            # React components
│   ├── InventoryList.tsx  # Parts list with filters
│   ├── Library.tsx        # Sets library view
│   ├── SetCard.tsx        # Set card component
│   └── SyncStatus.tsx     # Offline/sync indicator
├── db/                    # Dexie (IndexedDB) client
│   ├── database.ts        # Schema definition
│   ├── queries.ts         # Database queries
│   └── sync-queue.ts     # Offline sync queue
├── lib/                   # Utilities
│   ├── db/                # Prisma DB helpers
│   ├── hooks/             # Custom React hooks
│   └── logger.ts          # Logging utilities
├── rebrickable/           # Rebrickable API client
│   ├── client.ts          # API client
│   ├── mappers.ts         # Data mappers
│   └── types.ts           # TypeScript types
├── prisma/                # Prisma schema & migrations
│   └── schema.prisma      # Database schema
└── messages/              # i18n translations
    ├── en.json
    └── fr.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Create and apply migrations (dev)
- `npm run db:push` - Push schema changes (dev only)
- `npm run db:studio` - Open Prisma Studio
- `npm run generate-icons` - Generate PWA icons

## API Routes

### Public Routes

- `GET /api/health` - Health check
- `GET /api/sets/search?q=...` - Search sets (Rebrickable proxy)
- `GET /api/sets/[setNum]` - Get set details (Rebrickable proxy)
- `GET /api/sets/[setNum]/parts` - Get set parts (Rebrickable proxy)

### Protected Routes (Require Authentication)

- `POST /api/sets` - Add set to library
- `DELETE /api/sets/[setNum]` - Remove set from library
- `GET /api/sets/sync` - Sync sets from database
- `GET /api/sets/[setNum]/progress` - Get progress for a set
- `POST /api/sets/[setNum]/progress` - Save progress for a set
- `PATCH /api/sets/[setNum]/ongoing` - Toggle ongoing status

## Rate Limiting

- **Proxy routes**: 60 requests per minute per IP
- **Auth routes**: 10 sign-in attempts per 15 minutes per IP

## Caching

- **Search results**: 5 minutes cache, 10 minutes stale-while-revalidate
- **Set details**: 1 hour cache, 2 hours stale-while-revalidate
- **Parts inventory**: 1 hour cache, 2 hours stale-while-revalidate

## Deployment

### Vercel (Recommended)

1. **Link your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically:

   - Run `prisma generate` during build
   - Build the Next.js app

4. **Run migrations** (after first deploy):
   ```bash
   npx prisma migrate deploy
   ```

### Environment Variables for Production

Ensure all variables from `.env.local` are set in Vercel, including:

- `REBRICKABLE_API_KEY`
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
- `NEXTAUTH_SECRET`
- `AUTH_URL` (your production URL)
- `DATABASE_URL` and `PRISMA_DATABASE_URL`

## Development Notes

- **Local Development**: Use `AUTH_URL=http://localhost:3000`
- **iPad Testing**: Use your Mac's local IP address (e.g., `http://192.168.1.100:3000`) or deploy to Vercel
- **Database**: Local dev uses `DATABASE_URL`, production uses `PRISMA_DATABASE_URL` (Prisma Accelerate)
- **Migrations**: Always commit migration files with schema changes

## Documentation

- **`AGENTS.md`** - Comprehensive project documentation and conventions
- **`PROJECT_SCOPE.md`** - Full project scope and ticket details
- **`prisma/schema.prisma`** - Database schema definition
- **`db/database.ts`** - Client-side IndexedDB schema

## License

Private project - All rights reserved

## Support

For questions, bugs, or feature requests, contact: brickly@tomtom.design
