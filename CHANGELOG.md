# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
