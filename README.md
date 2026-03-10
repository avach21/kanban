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
