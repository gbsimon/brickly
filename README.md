# BrickByBrick

A PWA for tracking LEGO sets and inventory, built with Next.js, TypeScript, and Tailwind CSS.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, set up your environment variables:

```bash
# Copy the example env file
cp env.example .env.local

# Edit .env.local and add your Rebrickable API key
# Get your API key from: https://rebrickable.com/api/
```

Add your Rebrickable API key to `.env.local`:
```
REBRICKABLE_API_KEY=your_api_key_here
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Routes

- `GET /api/health` - Health check endpoint
- `GET /api/sets/search?q=...` - Search for LEGO sets (proxies to Rebrickable API)

## Project Structure

- `app/` - Next.js App Router routes and layouts
- `components/` - React components
- `lib/` - Utility functions and helpers
- `db/` - Dexie database schema and queries
- `rebrickable/` - Rebrickable API types and client
- `app/api/` - Vercel serverless API routes

## Development

This project uses:
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Dexie** for IndexedDB storage

## Deployment

The app is designed to be deployed on Vercel. See `PROJECT_SCOPE.md` for full project details.

