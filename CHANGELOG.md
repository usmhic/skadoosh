# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Creator-platform direction and Kudos economy: product spec (`docs/PRODUCT.md`) and Kudos spec
  (`docs/KUDOS.md`).
- Hot/Cold Kudos: giving to pieces and projects (Kudos now reach the creator), backing projects
  in Idea or Making with stage weights, milestone-based releases, capped returns to backers,
  48-hour change of heart, cancel-and-thaw, and a weekly allowance.
- Append-only `kudos_ledger` with a wallet page (`/kudos`) showing balances, backings, and history.
  Purchases, unlocks, comments, and signups are recorded too.
- Public project pages (`/projects/:id`) with stage track, milestones, process log, open roles
  ("raise your hand" to the creator's inbox), backers wall with backer numbers, and a
  "Made by humans" AI-use disclosure.
- Discover modes (For you, Following, Rising, Seeking backers, Open collabs, New voices), craft
  Circles (`/circles`), follows, and reputation signals on profiles, plus a "Believes in" tab.
- Studio: pitch, backing terms, milestone planning and delivery, stage changes, process updates,
  open roles, and originality confirmation (required to publish a project). AI-use disclosure for
  pieces.
- Migration `0001_kudos_economy`, demo projects in the seed, unit tests for the economy rules
  (`pnpm test`, also run in CI), and a mobile tab bar for the web app.

- Shared engineering standards, coding-agent guidance, Dependabot configuration,
  and a private security-reporting path.
- Initial public documentation pass: `LICENSE`, `CODE_OF_CONDUCT.md`, issue/PR
  templates, `ARCHITECTURE.md`, `STANDARDS.md`, restored root `.env.example`, and a
  root `docker-compose.yml` for local development.

### Fixed

- Replaced POSIX-only install and database lifecycle scripts with
  cross-platform Node helpers; a fresh install now waits for `.env` before
  preparing the database.
- Restored `.env.example` (previously deleted, but still referenced by README
  and CONTRIBUTING).
- Corrected CONTRIBUTING.md's description of `pnpm lint` — it runs `tsc --noEmit`
  type checking, not ESLint (no ESLint dependency exists in this repo).
- Renamed `.github/workflows/ci.yml` → `web-ci.yml` and `mobile.yml` →
  `mobile-ci.yml` for naming consistency with the other project workflows.

### Changed

- Redesigned the web experience around Kudos: new home, header wallet chip (Hot · Cold),
  navigation (Discover, Circles, Kudos, Studio), shared cards, and Hot/Cold design tokens.
- "Cold Kudos" now means Kudos committed to projects. Kudos a piece has received are labelled
  "Kudos received".
- Usernames that collide with top-level routes are reserved.

- Replaced the private Metro exclusion-list import with the supported block-list configuration and set `NODE_ENV=production` for EAS release builds.
- Aligned the mobile workspace with Expo SDK 55, added the required `react-dom` peer dependency, and removed the conflicting static Expo config so native builds use one validated configuration.
- Standardized the Android application ID to `com.osascloud.skadoosh` for Google Play releases.
- Pinned Android EAS builds to Node 22.13.1 for compatibility with the workspace's pnpm 11.6.0 toolchain and removed unused OTA channel settings from store profiles.
- Added a documented package-naming contract for the `@skaddosh/*` workspace scope and product/repository spelling exception.
- Recreated the database history as one generated `0000_initial.sql` baseline,
  with matching Drizzle journal and snapshot metadata for clean deployments.
- Aligned package, web, container, Compose, and workflow metadata with the
  usmhic open-source ecosystem.

## [0.1.0] - 2026-07-18

### Added

- Turborepo monorepo: Next.js 16 web app, Expo mobile app, and shared
  `api`/`auth`/`db`/`i18n`/`ui` packages.

[Unreleased]: https://github.com/usmhic/skadoosh/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/usmhic/skadoosh/releases/tag/v0.1.0
