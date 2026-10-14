# Architecture

This document explains *why* skaddosh is organized the way it is. For *how* to work inside a
specific app or package, see its own README where one exists (e.g. `apps/web`, `packages/db`).

## Overview

```
┌─────────────────────────────────────────────┐
│  apps/web  (Next.js 16 — the only deployable service)
│                                               │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐ │
│  │ packages │  │ packages  │  │ packages  │ │
│  │  /api    │  │  /auth    │  │   /db     │ │
│  │ (tRPC)   │  │(BetterAuth│  │ (Drizzle) │ │
│  └────┬─────┘  └─────┬─────┘  └─────┬─────┘ │
│       └──────────────┴──────────────┘        │
│                       │                       │
└───────────────────────┼───────────────────────┘
                         │
                    ┌────┴────┐
                    │ Postgres │
                    └─────────┘

apps/mobile (Expo) ──── tRPC over HTTP ────▶ apps/web's API routes

packages/api ── viem (operator key, queued) ──▶ Base: KudosToken + CreativeRegistry
Veriff ── signed decision webhook ──▶ /api/identity/veriff
scheduler ── POST /api/chain/reconcile (Bearer CRON_SECRET)
```

The chain and the identity provider are optional. If they aren't configured, `chainConfig()` and
`identityProvider()` report them as disabled, and the product works off-chain without verification gates.

Unlike expenn and freesolo (which run a standalone backend service), skaddosh's "backend" is a
set of shared, typed packages (`packages/api`, `packages/auth`, `packages/db`) imported directly
into `apps/web` and exposed through Next.js API routes. There is exactly one deployable service —
the Docker image built from the root `Dockerfile` only packages `apps/web`. `apps/mobile` is a
separate Expo client that calls that same Next.js app's tRPC endpoints over HTTP; it isn't bundled
into the Docker image and has its own release path (EAS builds via `mobile-ci.yml`, not GHCR).

## Directory purposes

| Directory | Responsibility |
|---|---|
| `apps/web/src/app/` | Next.js App Router pages and API routes (including the tRPC handler) |
| `apps/web/src/lib/` | Client-side helpers — tRPC provider, auth client, storage, i18n context |
| `apps/mobile/src/screens/` | Expo app screens |
| `apps/mobile/src/lib/` | tRPC client, auth, i18n for the mobile app |
| `packages/api/src/routers/` | tRPC router definitions, one file per domain area (works, projects, kudos, discover, creators, users, etc.) — the actual "backend" logic |
| `packages/api/src/lib/kudos-economy.ts` | Pure Kudos rules (stage weights, releases, returns, caps, allowance). No I/O, unit-tested, also exported to clients as `@skaddosh/api/kudos` |
| `packages/api/src/lib/kudos-ledger.ts` | Transactional helpers that move Kudos and write `kudos_ledger` rows. Every balance change goes through here |
| `packages/api/src/lib/chain.ts`, `chain-ops.ts` | Chain configuration, viem clients, and the `chain_operation` queue (exports, imports, attestations). See [docs/CHAIN.md](docs/CHAIN.md) |
| `packages/api/src/lib/identity.ts` | Identity provider (Veriff, plus a dev-only mock), webhook verification, and the `assertVerified` gate. See [docs/IDENTITY.md](docs/IDENTITY.md) |
| `packages/api/src/lib/licensing.ts`, `packages/db/src/legal.ts` | Versioned licence and contributor-agreement templates, rendering, and hashing |
| `packages/contracts/` | Foundry project: `KudosToken`, `CreativeRegistry`, tests, the idempotent CREATE2 deploy script, and the generated ABI (`@skaddosh/contracts/abi`). Not part of the Docker image's build, and its scripts are prefixed `contracts:` so Turbo doesn't run Forge |
| `packages/auth/src/` | Better Auth server/client configuration, shared by web and mobile |
| `packages/db/src/schema.ts` | Drizzle schema — the source of truth for the database shape |
| `packages/db/drizzle/` | Generated SQL migrations |
| `packages/db/src/migrate.ts`, `seed.ts` | Scripts run by `docker-entrypoint.sh` at container start and by `pnpm db:*` locally |
| `packages/i18n/` | Shared i18next configuration and translation loading |
| `packages/ui/` | Shared component library (shadcn-style), consumed by `apps/web` |
| `packages/typescript-config/` | Shared `tsconfig.json` bases (`base.json`, `nextjs.json`, `react-library.json`) |
| `scripts/with-root-env.mjs` | Loads the root `.env` before running Turbo tasks, so every workspace package sees the same environment without duplicating `.env` files |
| `ARCHITECTURE.md` | This file — engineering-facing architecture documentation |

## Data flow

1. A client (the Next.js app itself via React Server Components, or the Expo app over HTTP) calls
   a tRPC procedure defined in `packages/api/src/routers/`.
2. The procedure uses Better Auth (`packages/auth`) to resolve the current session and Drizzle
   (`packages/db`) to read/write Postgres.
3. On container start, `docker-entrypoint.sh` runs `packages/db/src/migrate.ts` (unless
   `SKIP_MIGRATIONS=true` or `RUN_MIGRATIONS=false`) before handing off to the Next.js server, so
   the schema is always current before the app accepts traffic.

## Database startup

`packages/db/src/migrate.ts`'s `runMigrations()` — run by `docker-entrypoint.sh` at container
start (unless `SKIP_MIGRATIONS=true`/`RUN_MIGRATIONS=false`), and by `pnpm db:deploy` — does the
full sequence before the app serves traffic:

1. `ensureDatabaseExists` (`packages/db/src/ensure-db.ts`) connects to Postgres's `postgres`
   maintenance database, checks `pg_database` for the target database, and creates it if missing.
   This same function also backs the dev-only `db:push` script, so both paths share one
   implementation instead of two copies that could drift.
2. An advisory lock (`pg_try_advisory_lock`) is acquired so concurrent boots (e.g. multiple
   container replicas) don't race to migrate at once.
3. Drizzle's real `migrate()` applies the generated migrations in `packages/db/drizzle/`
   (`0000_initial.sql`, the baseline, then `0001_kudos_economy.sql`, which adds projects' stages,
   backings, milestones, the process log, follows, and the Kudos ledger, and backfills an
   opening-balance ledger row for every existing user) and records each in
   `drizzle.__drizzle_migrations` so it is never re-run once applied. The SQL, snapshots, and
   journal are generated together from `packages/db/src/schema.ts` with `pnpm db:generate`; each
   journal tag must match its SQL filename.

The initial migration targets a clean database. A database already managed by the current baseline
keeps its existing Drizzle journal and is not migrated again. For any older or manually created
database, take a verified backup and explicitly baseline it only after confirming that its schema
matches `packages/db/src/schema.ts`; do not run the initial migration over populated untracked
tables.

Local dev intentionally uses a different, faster path: `db:push` (via `pnpm dev`'s
`db:prepare`) uses `drizzle-kit push` to sync the schema directly without generating migration
files — convenient for iterating on `packages/db/src/schema.ts`, but not migration-tracked. Only
`db:migrate`/`db:deploy` (the container/production path) is the source of truth for what "pending
migrations" means.

## Key design decisions

- **One deployable service**: keeping the backend as in-process packages rather than a separate
  API server means there's only one Docker image, one health surface, and one deploy to reason
  about. The trade-off is that `apps/mobile` depends on `apps/web` being reachable — there's no
  independent backend to point mobile at.
- **Shared typed packages over a network boundary**: `packages/api`'s tRPC routers are consumed
  directly (in-process) by `apps/web` and over HTTP by `apps/mobile`, so both clients share exact
  input/output types with zero codegen.
- **CI/CD**: `web-ci.yml` builds and pushes the Docker image;
  deployment beyond that (e.g. notifying a host like Dokploy) is not yet wired into the workflow —
  the `DOKPLOY_WEBHOOK_URL` secret referenced in the README is aspirational until that step is
  added. Mobile ships independently via EAS, triggered by `mobile-v*` tags.
  Contracts have their own `contracts-ci.yml` (format, build, fuzz tests, ABI drift, Slither) and an
  environment-protected `contracts-deploy.yml` whose CREATE2 deploy script only deploys what's missing.
- **The off-chain ledger stays authoritative**: on-chain Kudos exist only as mirrors of
  `export_onchain` and `import_onchain` ledger rows, and every chain write goes through the idempotent
  `chain_operation` queue. A lost transaction is reconciled or refunded, and is never minted twice.
- **No identity documents, no PII on-chain**: verification stores a status and a country. The registry
  stores hashes and HMAC account references, never names, emails, or content.
- **Kudos are a ledger, not just a number**: `user.kudos_balance` is the Hot balance and
  `project_backing` holds Cold positions, but every movement also writes an append-only
  `kudos_ledger` row inside the same transaction. Debits are conditional updates
  (`balance >= amount`), and project-level operations lock the project row (`SELECT … FOR UPDATE`)
  so concurrent backings, releases, and returns serialize. The economy rules are pure functions so
  they can be tested without a database. Product rules live in [`docs/KUDOS.md`](./docs/KUDOS.md).
- **Discovery ranks in-process**: `discover.feed` loads recent candidates and ranks them in
  TypeScript (distinct-supporter momentum, damped by creator size). That's simple and fast enough
  at current scale. Move ranking into SQL or a materialized view once candidate sets grow.
- **Environment loading via `scripts/with-root-env.mjs`**: rather than each package managing its
  own `.env`, a single root `.env` (see `.env.example`) is loaded once and passed through to every
  Turbo task, keeping local setup to one file.
