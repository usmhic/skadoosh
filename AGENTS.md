# Repository guide for coding agents

## Product

skaddosh is a multilingual publishing and creator-portfolio product. The GitHub
repository is named `skadoosh`; internal packages intentionally use the
`@skaddosh/*` scope.

## Map

- `apps/web`: Next.js App Router application and deployable API host.
- `apps/mobile`: Expo client.
- `packages/api`: tRPC routers and shared API types.
- `packages/auth`: Better Auth integration.
- `packages/db`: Drizzle schema, migration, and seed data.
- `packages/i18n` and `packages/ui`: shared language and UI primitives.

Read `ARCHITECTURE.md` before changing boundaries or data flow.

## Commands

Use the pinned Node and pnpm versions from `mise.toml`.

- Install: `pnpm install --frozen-lockfile`
- Develop: `pnpm dev`
- Check: `pnpm lint`
- Build: `pnpm build`
- Database: `pnpm db:prepare`

Copy `.env.example` to `.env` before commands that require services.

## Guardrails

- Run commands from the repository root unless a package README says otherwise.
- Preserve end-to-end tRPC types; do not duplicate API contracts in a client.
- Keep database changes in the schema, migration, seed, and docs together.
- Never expose server secrets through `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`.
- Keep the `skadoosh` repository / `skaddosh` product spelling distinction.
- Update `.env.example`, documentation, and tests with public behavior.
