# Local development

Use the Node and pnpm versions in `mise.toml`. The root `.env` is the only local
configuration file; `.env.example` has the same keys, groups, and line positions.
Keep template secrets empty and put generated development secrets in `.env`.
Run `node scripts/check-env.mjs` after editing either file.

The workspace uses distinct ports so all three products can run together:

| Product | Web | API | Expo | PostgreSQL | S3 | S3 console |
| --- | --- | --- | --- | --- | --- | --- |
| skaddosh | 3000 | 3000 | 8081 | 5432 | 9000 | 9001 |
| Expenn | 3001 | 5000 | 8082 | 5433 | 9010 | 9011 |
| FreeSolo | 3002 | 8080 | 8083 | 5434 | 9020 | 9021 |

Database and storage usernames match the product (`skaddosh`, `expenn`, or
`freesolo`). Read their passwords from your local `.env`. Expenn uses the same
`JWT_SECRET` / `Jwt__Secret`, `MINIO_PASSWORD` / `Storage__SecretKey`, and
`RABBITMQ_PASSWORD` / `RabbitMq__Password`; FreeSolo uses the same
`MINIO_PASSWORD` / `MINIO_SECRET_KEY`. Keep each pair synchronized.

`DATABASE_URL` points to the host database for native development. Compose maps
the same credentials to its internal service names. Port settings control host
bindings; public URLs must also reflect any port changes. The apps do not invent
credentials for OAuth, billing, AI, email, or store services: configure your own
sandbox account when using those optional integrations.

For a physical phone, set mobile API URLs to your computer's LAN address; Android
emulators can use `10.0.2.2` in place of `localhost`. Do not put server secrets in
`NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` values.

## Start

From this repository root, `docker compose up --build` runs the web/API, database,
and storage services. For native development, start PostgreSQL and S3 storage
first, then run:

```sh
pnpm install --frozen-lockfile
pnpm dev:web
pnpm dev:mobile
```

The API runs inside the Next.js app. Database preparation and demo seeding happen
through `pnpm db:prepare`. The Expo server uses port 8081.

## Brand assets

`apps/web/public/brand/logo.png` is the source logo. Run
`node scripts/generate-brand.mjs` after installing dependencies to regenerate
the compact UI mark, browser icons, Apple touch icon, web manifest, 1200×630 social
card, mobile launcher, padded adaptive foreground, and splash asset. The original
logo is preserved. Android foreground artwork stays inside its safe area, and
launcher icons are opaque 1024×1024 images.

## GitHub workflows

All development and pull requests target `dev`. Web/API CI publishes `dev` and
commit-SHA container tags on pushes to `dev`; it does not update a `latest` tag.
Android tester builds run on `dev`; iOS tester builds remain manual. Store builds
are manual workflows selected on `dev`, using the existing production environment.
Version-tag GitHub releases verify that the tagged commit belongs to `dev`.

Local checks and setup never require a commit or push.
