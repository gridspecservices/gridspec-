# GridLens

GridLens helps utility inspection teams review drone-detected asset findings and prepare work for field crews.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/gridlens/src/` — responsive workspace UI, project review, and draft work-order flows
- `artifacts/api-server/src/routes/gridlens.ts` — implemented GridLens API routes
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/` — PostgreSQL tables for projects, findings, work orders, and activity
- `artifacts/api-server/src/lib/gridlens.ts` — workspace summaries and fictional demo seed data

## Architecture decisions

- The API server uses the generated OpenAPI Zod schemas to validate requests and responses.
- Workspace state and summaries are read from PostgreSQL; the UI uses generated React Query hooks and invalidates affected queries after writes.
- Fictional demo data is seeded at API startup and can be loaded again idempotently from the empty-workspace action.

## Product

### Working now

- Workspace dashboard with project, finding severity, review, work-order, and recent activity summaries.
- Project pages with searchable/filterable assets and editable finding notes, defect type, severity, and review status.
- Draft crew work orders linked to findings, plus project creation.
- Fictional demo records are labeled in the UI.

### Future scope (not implemented)

- Drone image upload, flight-data ingestion, and bulk asset imports.
- Work-order approval, dispatch, assignment changes, and completion tracking.
- Photo evidence storage and report/export workflows.

## User preferences

No project-specific preferences have been provided.

## Gotchas

- The API service expects `DATABASE_URL` and the database schema must be pushed with `pnpm --filter @workspace/db run push`.
- Use `pnpm run typecheck` for the canonical full workspace typecheck.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
