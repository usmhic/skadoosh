# Contributing to skaddosh

Thanks for contributing. skaddosh is built for creators, so every improvement should help people write, publish, and be discovered with less friction. By participating, you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 24.18.0 | Web + mobile + shared packages |
| pnpm | 11.6.0 | Workspace package manager |
| PostgreSQL | 15+ running locally | Shared database |

Recommended: use [mise](https://mise.jdx.dev) — run `mise install` from the repo root to get the pinned Node/pnpm versions automatically (see `mise.toml`).

## Getting started

```bash
# 1. Clone
git clone https://github.com/usmhic/skadoosh.git && cd skadoosh

# 2. Install all workspace dependencies
pnpm install --frozen-lockfile # skips database work until .env exists

# 3. Environment
cp .env.example .env        # then open .env and fill in required values (see below)

# 4. Prepare the local database
pnpm db:prepare
```

**Minimum `.env` values to fill in:**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string for the selected runtime |
| `BETTER_AUTH_SECRET` | Any 32+ character random string — `openssl rand -base64 32` |

For native development, also fill the local Postgres credentials used by the
Compose database service; keep `DATABASE_URL` consistent with them. The Compose stack also needs
`POSTGRES_PASSWORD`, `MINIO_ACCESS_KEY`, and `MINIO_SECRET_KEY`. MinIO uploads
fall back to the local filesystem outside Compose; Paddle, email, and OAuth are
skipped when keys are empty.

```bash
# 5. Start development servers
pnpm dev                    # starts web on :3000 and mobile bundler
pnpm dev:web                # web only
pnpm dev:mobile             # mobile Expo bundler only
```

Alternatively, run `docker compose up --build` from the repo root to start Postgres, MinIO, and the web app together — see the root [README](./README.md#quick-start).

## Repository structure

```
skadoosh/
├── apps/
│   ├── web/                Next.js 16 web app (tRPC, Drizzle, Better Auth)
│   └── mobile/              Expo mobile app
├── packages/
│   ├── api/                tRPC router definitions
│   ├── auth/                Better Auth config
│   ├── db/                  Drizzle schema + migrations
│   ├── i18n/                Internationalisation (i18next)
│   └── ui/                  Shared component library
├── scripts/                Build helpers (env loader, Turbo wrappers)
├── ARCHITECTURE.md         Why the repo is organized this way
└── STANDARDS.md            Shared engineering standards across the workspace
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the reasoning behind these boundaries.

## Database commands (run from repo root)

```bash
pnpm db:sync        # synchronize the local schema with migration awareness
pnpm db:migrate     # apply named migrations (production)
pnpm db:generate    # regenerate migration files after schema changes
pnpm db:seed        # seed sample data
pnpm db:studio      # open Drizzle Studio
```

## Branching strategy

| Branch | Purpose |
|---|---|
| `dev` | Default branch, integration, and release base. |

| Type | Branch prefix | Example |
|---|---|---|
| Feature | `feat/` | `feat/creator-portfolios` |
| Bug fix | `fix/` | `fix/otp-expiry` |
| Chore/tooling | `chore/` | `chore/update-deps` |
| Docs | `docs/` | `docs/contributing` |

Branch off `dev` and open PRs against `dev`. Maintainers may prepare changes
directly on `dev`; check the diff and run the relevant checks before committing.
Avoid persistent bot branches.

## Commit message conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/): imperative mood, lowercase, no trailing period.

```
feat: add creator portfolio sections
fix: invalidate expired OTP sessions
```

## Code style & quality

```bash
pnpm lint           # type-check configured packages, via turbo
pnpm format         # Prettier
```

> Note: `pnpm lint` runs TypeScript's `tsc --noEmit` per package, **not** ESLint — this repo has no ESLint dependency configured. If you want stricter linting on a package you're touching, that's a welcome contribution, but it isn't currently enforced in CI. Formatting for `.ts`/`.tsx`/`.md` files uses Prettier (no committed `.prettierrc`, so defaults apply) and the repo's [`.editorconfig`](./.editorconfig) for everything else.

## Testing

Run `pnpm test` for the focused API tests covering Kudos economy rules.
These do not replace database-ledger integration tests or end-to-end testing of authentication,
publishing, payments, or mobile delivery. Exercise affected flows locally and
add focused tests for meaningful behavior changes.

## Pull request guidelines

1. Fork → branch off `dev`
2. Keep PRs focused — one logical change per PR
3. Describe *why* in the PR body, not just what changed — use the [PR template](./.github/PULL_REQUEST_TEMPLATE.md)
4. All CI checks must pass before merge

## Adding a new package

1. Create `packages/<name>/` with a `package.json` using `"name": "@skaddosh/<name>"`
2. Add it as a workspace dependency where needed: `"@skaddosh/<name>": "workspace:*"`
3. Run `pnpm install` to link it

## Dependency updates

After pulling a branch that changes any `package.json`, re-run from the repo root to sync all lockfile entries:

```bash
pnpm install
```

Review framework and Expo compatibility before upgrading. Scheduled bot version
PRs are paused; dependency maintenance and security-alert triage remain manual.

## Release process

1. Bump the version in the relevant manifest(s) (root `package.json`, and the `apps/*`/`packages/*` package you changed) following [SemVer](https://semver.org)
2. Add an entry under `[Unreleased]` in [`CHANGELOG.md`](./CHANGELOG.md), then move it under a new `[X.Y.Z] - YYYY-MM-DD` heading
3. Tag the release: `git tag vX.Y.Z && git push origin vX.Y.Z`
4. `release.yml` automatically creates a GitHub Release with generated notes
5. `web-ci.yml` builds and pushes `dev` and immutable SHA images on pushes to `dev`; there is no automatic `latest` promotion

Mobile store releases use manual dispatch of `mobile-android-release.yml` or
`mobile-ios-release.yml` from `dev`, with the production environment and required
credentials. Tester builds use the `*-dev.yml` workflows. See
[MOBILE_DELIVERY.md](./MOBILE_DELIVERY.md). Release tags must point to a commit
reachable from `dev`.

## CI overview

| Workflow | What it gates |
|---|---|
| `web-ci.yml` | type-check + focused tests + production build, check logs, Docker smoke test |
| `mobile-android-dev.yml` / `mobile-ios-dev.yml` | Native tester builds; Android on `dev` pushes, iOS manual |
| `mobile-android-release.yml` / `mobile-ios-release.yml` | Manual signed store submissions from `dev` |
| `release.yml` | Creates a GitHub Release on `v*.*.*` tag push |

## Creative invite

Pick a lane and ship a focused improvement:

- Creator lane: studio UX, writing flow, publishing confidence.
- Reader lane: discovery, reading comfort, Kudos interactions.
- Portfolio lane: storytelling layouts, analytics clarity, contact quality.
- Platform lane: reliability, type safety, and operational simplicity.

If your PR improves one real user journey end-to-end, it is high-value even if the diff is small.

## Getting help

Open an [issue](https://github.com/usmhic/skadoosh/issues) or start a discussion — that's the fastest way to reach the maintainer.
