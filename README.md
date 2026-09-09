<div align="center">

# ✍️ skaddosh

### A home for human creativity.

**A publishing and reading platform for people who still write things.**
Writers share stories, essays, poems, and journals. Readers discover them,
support them, and say so with Kudos. No algorithmic slop — just people,
writing, and other people reading it.

<br />

[![Live demo](https://img.shields.io/badge/▶_Live_demo-skadoosh.osas.cloud-918781?style=for-the-badge&labelColor=1C1917)](https://skadoosh.osas.cloud)
[![Read](https://img.shields.io/badge/📚_Start_reading-Explore_works-918781?style=for-the-badge&labelColor=1C1917)](https://skadoosh.osas.cloud)
[![Studio](https://img.shields.io/badge/🖋_Creator_studio-Write_something-918781?style=for-the-badge&labelColor=1C1917)](https://skadoosh.osas.cloud/studio)

[![iOS](https://img.shields.io/badge/iOS-Coming_soon-1C1917?style=for-the-badge&logo=apple&logoColor=white)](#mobile-apps)
[![Android](https://img.shields.io/badge/Android-Coming_soon-1C1917?style=for-the-badge&logo=android&logoColor=white)](#mobile-apps)

<br />

[![Web CI](https://github.com/usmhic/skadoosh/actions/workflows/web-ci.yml/badge.svg)](https://github.com/usmhic/skadoosh/actions/workflows/web-ci.yml)
[![Android CI](https://github.com/usmhic/skadoosh/actions/workflows/mobile-android-dev.yml/badge.svg)](https://github.com/usmhic/skadoosh/actions/workflows/mobile-android-dev.yml)
[![iOS CI](https://github.com/usmhic/skadoosh/actions/workflows/mobile-ios-release.yml/badge.svg)](https://github.com/usmhic/skadoosh/actions/workflows/mobile-ios-release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

<sub>Next.js 16 · React 19 · tRPC · Drizzle · PostgreSQL · Expo · Turborepo · typed end to end</sub>

</div>

---

## 🎬 Try the demo

| Where | Link | What you'll see |
|---|---|---|
| 📚 **Reader** | **[skadoosh.osas.cloud](https://skadoosh.osas.cloud)** | Discovery, reading, profiles, and Kudos |
| 🖋 **Studio** | **[skadoosh.osas.cloud/studio](https://skadoosh.osas.cloud/studio)** | The creator surface — works, drafts, publishing controls |
| 🎨 **Portfolio** | [skadoosh.osas.cloud](https://skadoosh.osas.cloud) | Public creator pages, projects, contact, and analytics |

> 💡 **One app, no separate backend.** `packages/api`, `packages/auth`, and `packages/db` *are*
> the backend — they run in-process inside the Next.js app. Clone it, run one command, and the
> whole platform is on your machine with seeded demo content.

## 📛 A note on the name

This repository lives at `github.com/usmhic/skadoosh` — the product and internal package scope
(`@skaddosh/*`) are spelled **skaddosh**, while the GitHub repo name is **skadoosh**. Both are
intentional; just be aware which one a given URL needs. See
[PACKAGE_NAMING.md](./PACKAGE_NAMING.md).

## 🗺️ What's inside

| | Surface | Highlights |
|---|---|---|
| 📚 | **Reader** | Discovery, reading experience, profiles, and Kudos |
| 🖋 | **Creator** | Studio, works, drafts, and publishing controls |
| 🎨 | **Portfolio** | Public pages, projects, contact forms, analytics, premium features |
| 📱 | **Mobile** | Expo app for read, discover, and studio workflows over the same tRPC API |
| 🔎 | **AI search** | OpenAI-backed discovery across published works |
| 🌍 | **i18n** | Shared i18next localization across web and mobile |

## 🧱 Tech stack

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

## 🚀 Quick start

Prefer [mise](https://mise.jdx.dev) to install the pinned Node/pnpm versions — run `mise install`
from the repo root (see `mise.toml`).

```bash
git clone https://github.com/usmhic/skadoosh.git && cd skadoosh

# 1) Install
pnpm install

# 2) Environment
cp .env.example .env       # PowerShell: Copy-Item .env.example .env
# Set DATABASE_URL and BETTER_AUTH_SECRET for native development.
# For Compose, also set POSTGRES_PASSWORD, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY.

# 3) Prepare the database and start development
pnpm db:prepare
pnpm dev
```

☕ Then open **http://localhost:3000** — the seed script gives you demo content to click through
immediately.

Prefer containers? `docker compose up --build` from the repo root starts Postgres, MinIO, and the
web app together.

## 🛠️ Development workflow

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

## 🏛️ Architecture at a glance

```
skadoosh/
├── apps/
│   ├── web/     Next.js 16 app (reader, creator, portfolio, billing)
│   └── mobile/  Expo app (read, discover, studio workflows)
├── packages/
│   ├── api/     Shared tRPC router  ─┐
│   ├── auth/    Better Auth setup   ─┼─ the backend, running in-process
│   ├── db/      Drizzle schema      ─┘
│   ├── i18n/    Shared localization layer
│   └── ui/      Shared UI components and styles
└── scripts/     Workspace automation and env tooling
```

A Turborepo monorepo: one deployable Next.js app (`apps/web`) that pulls in shared, typed
packages, plus an Expo mobile app that talks to the web app's tRPC API. There's no separate
backend service. Full breakdown in [ARCHITECTURE.md](./ARCHITECTURE.md).

## 📁 Repository structure

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

## 🔧 Environment variables

Copy [`.env.example`](./.env.example) to `.env` and fill values locally; the tracked template is
intentionally empty. Native development requires `DATABASE_URL` and `BETTER_AUTH_SECRET`. The
Compose stack also requires `POSTGRES_PASSWORD`, `MINIO_ACCESS_KEY`, and `MINIO_SECRET_KEY`.
Paddle, OpenAI, Resend, and OAuth remain optional. See
[CONTRIBUTING.md](./CONTRIBUTING.md#getting-started) for details.

⚠️ The install hook prepares the database only when `.env` already exists. On a fresh clone,
configure the environment first and run `pnpm db:prepare` explicitly. Set `SKIP_DB_PREPARE=true`
in the shell or `.env` to skip the hook in automation.

## Mobile apps

<div align="center">

[![iOS](https://img.shields.io/badge/iOS-Coming_soon-1C1917?style=for-the-badge&logo=apple&logoColor=white)](#mobile-apps)
[![Android](https://img.shields.io/badge/Android-Coming_soon-1C1917?style=for-the-badge&logo=android&logoColor=white)](#mobile-apps)

</div>

📱 **The App Store and Play Store listings aren't live yet** — the Expo app builds through EAS
today, and store submission is next. Until then, running it takes about a minute:

```bash
pnpm dev:mobile
```

Scan the QR code with **Expo Go** and you're in. Point `EXPO_PUBLIC_API_URL` at your machine's LAN
address when testing on a physical device. See [apps/mobile/](./apps/mobile).

| | Identifier |
|---|---|
| 🍎 iOS bundle | `app.skaddosh.mobile` |
| 🤖 Android package | `com.osascloud.skadoosh` |

## 🤖 CI/CD

| Workflow | Trigger | What it does |
|---|---|---|
| `web-ci.yml` | push to `dev`, PR to `main`/`dev`, manual dispatch | type-check (all packages) + lint → Docker build/push to GHCR (push only) → Docker smoke test (PR only) |
| `mobile-ci.yml` | manual dispatch, push of tag `mobile-v*` | type-check → EAS build (requires `EXPO_TOKEN` + `EAS_PROJECT_ID` secrets) |
| `release.yml` | push of tag `v*.*.*` | creates a GitHub Release with auto-generated notes |

The image is published to `ghcr.io/usmhic/skadoosh`, tagged `latest` (from `main`), by branch/tag
ref, and `sha-<short-sha>`. Workflow concurrency is enabled, so older in-progress runs on the same
ref are cancelled automatically.

Required GitHub secrets/vars:

- `DOKPLOY_WEBHOOK_URL` (optional, CI deploy notification — not currently wired into `web-ci.yml`, see `ARCHITECTURE.md`)
- `EXPO_TOKEN` (required for mobile EAS builds)
- `EAS_PROJECT_ID` (required for mobile EAS builds)
- `NEXT_PUBLIC_APP_URL` as a repository variable (recommended for Docker/app metadata)

## 📚 Documentation

| Doc | What's in it |
|---|---|
| [Contributing](./CONTRIBUTING.md) | Local setup, branch conventions, coding standards, release process |
| [Architecture](./ARCHITECTURE.md) | How the pieces fit together, directory purposes |
| [Engineering standards](./STANDARDS.md) | Shared conventions across every usmhic project |
| [Package naming](./PACKAGE_NAMING.md) | Package scopes and the intentional `skadoosh` / `skaddosh` spelling |
| [Coding-agent guide](./AGENTS.md) | Repository map, commands, and guardrails |
| [Security policy](./SECURITY.md) | Private vulnerability reporting and deployment notes |
| [Web app](./apps/web) · [Mobile app](./apps/mobile) | Per-app guides |
| [API package](./packages/api) · [DB package](./packages/db) | Router and schema internals |

## 🤝 Contributing

Issues and pull requests are welcome — focused fixes, bold ideas, and thoughtful docs improvements
all count. Start with [CONTRIBUTING.md](./CONTRIBUTING.md) and follow the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## 📄 License

[MIT](./LICENSE) © [usmhic](https://github.com/usmhic)

<div align="center"><sub>Written by humans, for humans. ✍️</sub></div>
