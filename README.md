# skaddosh

[![Web](https://github.com/usmhic/skadoosh/actions/workflows/web-ci.yml/badge.svg)](https://github.com/usmhic/skadoosh/actions/workflows/web-ci.yml)
[![Mobile](https://github.com/usmhic/skadoosh/actions/workflows/mobile-ci.yml/badge.svg)](https://github.com/usmhic/skadoosh/actions/workflows/mobile-ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

skaddosh is a publishing and reading platform for human creativity.
Writers share stories, essays, poems, and journals. Readers discover, support, and connect through Kudos.

> This repository lives at `github.com/usmhic/skadoosh` — the product and internal package scope (`@skaddosh/*`) are spelled "skaddosh"; the GitHub repo name is "skadoosh". Both are intentional, just be aware which one a given URL needs.

## Architecture

```
skadoosh/
├── apps/
│   ├── web/     Next.js 16 app (reader, creator, portfolio, billing)
│   └── mobile/  Expo app (read, discover, studio workflows)
├── packages/
│   ├── api/     Shared tRPC router
│   ├── auth/    Better Auth setup
│   ├── db/      Drizzle schema, migrations, and seed
│   ├── i18n/    Shared localization layer
│   └── ui/      Shared UI components and styles
└── scripts/     Workspace automation and env tooling
```

A Turborepo monorepo: one deployable Next.js app (`apps/web`) that pulls in shared, typed
packages, plus an Expo mobile app that talks to the web app's tRPC API. There's no separate
backend service — `packages/api`, `packages/auth`, and `packages/db` *are* the backend, run
in-process inside the Next.js app. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the
full breakdown.

## Tech stack

| Layer | Stack |
|---|---|
| Web | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Radix UI, tRPC |
| Mobile | Expo, React Native, tRPC client |
| API | tRPC (`packages/api`), typed end-to-end with the web and mobile clients |
| Auth | Better Auth (`packages/auth`) |
| Database | PostgreSQL via Drizzle ORM (`packages/db`) |
| i18n | i18next (`packages/i18n`) |
| Integrations | Paddle (billing), OpenAI (AI search), Resend (email), MinIO (uploads) |
| CI/CD | GitHub Actions → GHCR (`ghcr.io/usmhic/skadoosh`) |

## Repository structure

| Path | Purpose |
|---|---|
| [`apps/web/`](./apps/web) | Next.js app — the only deployable service; hosts the API routes too |
| [`apps/mobile/`](./apps/mobile) | Expo app, calls the web app's tRPC API |
| [`packages/api/`](./packages/api) | tRPC router definitions, shared by web and mobile |
| [`packages/auth/`](./packages/auth) | Better Auth configuration |
| [`packages/db/`](./packages/db) | Drizzle schema, migrations, and seed scripts |
| [`packages/i18n/`](./packages/i18n) | Shared localization layer |
| [`packages/ui/`](./packages/ui) | Shared UI components and styles |
| [`packages/typescript-config/`](./packages/typescript-config) | Shared `tsconfig.json` bases |
| [`scripts/`](./scripts) | Workspace automation (env loader used by Turbo tasks) |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Architecture and directory-structure documentation |

## Quick start

Prefer [mise](https://mise.jdx.dev) to install the pinned Node/pnpm versions — run `mise install` from the repo root (see `mise.toml`).

```bash
git clone https://github.com/usmhic/skadoosh.git && cd skadoosh

# 1) Install
pnpm install

# 2) Environment
cp .env.example .env
# Set DATABASE_URL and BETTER_AUTH_SECRET for native development
# For Compose, also set POSTGRES_PASSWORD, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY

# 3) Prepare the database and start development
pnpm db:prepare
pnpm dev
```

Alternatively, run `docker compose up --build` from the repo root to start Postgres, MinIO, and the web app together.

## Development workflow

```bash
pnpm dev         # db:prepare + turbo dev
pnpm dev:web     # db:prepare + web app only
pnpm dev:mobile  # db:prepare + mobile app only
pnpm build       # turbo build
pnpm lint        # type-check (tsc --noEmit) across all packages, via turbo

pnpm db:prepare  # ensure DB exists, sync schema, seed
pnpm db:deploy   # migrate + seed for start/prod-like flow
pnpm db:migrate  # drizzle migration apply
pnpm db:seed     # seed baseline/demo data
pnpm db:studio   # open Drizzle Studio
```

## Environment variables

Copy [`.env.example`](./.env.example) to `.env` and fill values locally; the
tracked template is intentionally empty. Native development requires
`DATABASE_URL` and `BETTER_AUTH_SECRET`. The Compose stack also requires
`POSTGRES_PASSWORD`, `MINIO_ACCESS_KEY`, and `MINIO_SECRET_KEY`. Paddle,
OpenAI, Resend, and OAuth remain optional. See
[CONTRIBUTING.md](./CONTRIBUTING.md#getting-started) for details.

The install hook prepares the database only when `.env` already exists. On a
fresh clone, configure the environment first and run `pnpm db:prepare`
explicitly. Set `SKIP_DB_PREPARE=true` in the shell or `.env` to skip the
hook in automation.

## CI/CD

| Workflow | Trigger | What it does |
|---|---|---|
| `web-ci.yml` | push to `dev`, PR to `main`/`dev`, manual dispatch | type-check (all packages) + lint → Docker build/push to GHCR (push only) → Docker smoke test (PR only) |
| `mobile-ci.yml` | manual dispatch, push of tag `mobile-v*` | type-check → EAS build (requires `EXPO_TOKEN` + `EAS_PROJECT_ID` secrets) |
| `release.yml` | push of tag `v*.*.*` | creates a GitHub Release with auto-generated notes |

The image is published to `ghcr.io/usmhic/skadoosh`, tagged `latest` (from `main`), by branch/tag ref, and `sha-<short-sha>`. Workflow concurrency is enabled, so older in-progress runs on the same ref are cancelled automatically.

Required GitHub secrets/vars:

- `DOKPLOY_WEBHOOK_URL` (optional, CI deploy notification — not currently wired into `web-ci.yml`, see `ARCHITECTURE.md`)
- `EXPO_TOKEN` (required for mobile EAS builds)
- `EAS_PROJECT_ID` (required for mobile EAS builds)
- `NEXT_PUBLIC_APP_URL` as a repository variable (recommended for Docker/app metadata)

## Product surfaces

- Reader surface: discovery, reading, profiles, and Kudos.
- Creator surface: studio, works, publishing controls.
- Portfolio surface: public pages, projects, contact, analytics, and premium features.

## Documentation

- [Contributing](./CONTRIBUTING.md) — local setup, branch conventions, coding standards, release process
- [Architecture](./ARCHITECTURE.md) — how the pieces fit together, directory purposes
- [Engineering standards](./STANDARDS.md) — shared conventions across every project in this workspace
- [Coding-agent guide](./AGENTS.md) — repository map, commands, and guardrails
- [Security policy](./SECURITY.md) — private vulnerability reporting and deployment notes
- [Web app](./apps/web)
- [Mobile app](./apps/mobile)
- [DB package](./packages/db)
- [API package](./packages/api)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Please also read our [Code of Conduct](./CODE_OF_CONDUCT.md). PRs are welcome, including focused fixes, bold ideas, and thoughtful docs improvements.

## License

[MIT](./LICENSE) © [usmhic](https://github.com/usmhic)
