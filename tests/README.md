# Tests

This directory contains smoke tests for core API endpoints.

## Setup

Install dependencies:

```bash
npm install
```

## Running Tests

Run tests in watch mode:
```bash
npm test
```

Run tests once:
```bash
npm run test:run
```

Run tests with UI:
```bash
npm run test:ui
```

## Test Coverage

Current test coverage includes:

- **Set Search** (`tests/api/sets/search.test.ts`)
  - Valid search queries
  - Invalid pagination parameters
  - Empty queries
  - Error handling

- **Add to Library** (`tests/api/sets/add.test.ts`)
  - Successful set addition
  - Unauthorized requests
  - Invalid set data validation
  - Error handling

- **Progress/Checklist** (`tests/api/sets/progress.test.ts`)
  - Get progress for a set
  - Save single progress item
  - Bulk save progress items
  - Validation errors
  - Unauthorized requests

- **Sync Endpoints** (`tests/api/sets/sync.test.ts`)
  - Sync sets successfully
  - Empty sets list
  - Unauthorized requests
  - Database error handling

## Test Strategy

- **Fast & Deterministic**: All tests use mocks, no external API calls
- **Focused**: Each test covers a specific scenario
- **Isolated**: Tests don't depend on each other
- **CI-Friendly**: Tests run in < 1 minute

## Mocks

- `tests/mocks/auth.ts` - Mock authentication data
- `tests/mocks/rebrickable.ts` - Mock Rebrickable API responses
