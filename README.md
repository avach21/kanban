# Kanban MVP Monorepo

This repository is a Bun workspace monorepo for a Kanban MVP.

## Structure

- `apps/web`: React + Vite frontend
- `apps/api`: Hono backend API
- `packages/db`: Drizzle ORM package
- `packages/types`: shared TypeScript types
- `infra/docker`: Docker-related files

## Quick start

1. Install Bun on your machine.
2. Copy `.env.example` to `.env` and update values.
3. Run `bun install` at repo root.
4. Run frontend: `bun run dev:web`
5. Run backend: `bun run dev:api`

## E2E tests

The Playwright suite lives in `e2e/` and runs the real web app and API against a
separate PostgreSQL database: `kanban_test`.

Before the first run, install the browser binary:

1. Run `bun run e2e:install`

Then run the suite:

1. Run `bun run e2e`

Useful variants:

1. `bun run e2e:headed`
2. `bun run e2e:ui`

The E2E setup does the following automatically:

1. Ensures the `kanban_test` database exists
2. Runs Drizzle migrations against that database
3. Starts a local mock Dog API so task creation does not depend on the public network
4. Starts the API on `http://127.0.0.1:3101`
5. Starts the web app on `http://127.0.0.1:4173`
