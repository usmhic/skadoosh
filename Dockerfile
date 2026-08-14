# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS deps
ENV CI=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json                     apps/web/package.json
COPY apps/mobile/package.json                  apps/mobile/package.json
COPY packages/api/package.json                 packages/api/package.json
COPY packages/auth/package.json                packages/auth/package.json
COPY packages/db/package.json                  packages/db/package.json
COPY packages/i18n/package.json                packages/i18n/package.json
COPY packages/typescript-config/package.json   packages/typescript-config/package.json
COPY packages/ui/package.json                  packages/ui/package.json
RUN --mount=type=cache,id=skaddosh-pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS builder
ENV CI=1 \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# APP_URL is baked into the client bundle (NEXT_PUBLIC_APP_URL). Server-only
# secrets are deliberately absent from the build and supplied at runtime.
# hadolint ignore=DL3044
ARG APP_URL=https://skaddosh

# hadolint ignore=DL3044
ENV NEXT_PUBLIC_APP_URL=$APP_URL \
    BETTER_AUTH_URL=$APP_URL \
    DATABASE_URL=postgresql://build@localhost/stub

COPY . .
RUN --mount=type=cache,id=skaddosh-next,target=/app/apps/web/.next/cache \
    pnpm --filter @skaddosh/web build

FROM node:24-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.title="skaddosh" \
      org.opencontainers.image.source="https://github.com/usmhic/skadoosh" \
      org.opencontainers.image.description="skaddosh web app (Next.js)" \
      org.opencontainers.image.authors="usmhic" \
      org.opencontainers.image.licenses="MIT"

RUN apk add --no-cache libc6-compat \
    && addgroup -g 1001 -S nodejs \
    && adduser  -u 1001 -S nextjs -G nodejs \
    && install  -d -o 1001 -g 1001 /app/apps/web/public/uploads

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOADS_DIR=/app/apps/web/public/uploads \
    DRIZZLE_MIGRATIONS_DIR=/app/packages/db/drizzle \
    RUN_MIGRATIONS=true \
    RUN_SEED=false \
    SKIP_MIGRATIONS=false

COPY --from=builder --link --chown=1001:1001 /app/apps/web/.next/standalone/ ./
COPY --from=builder --link --chown=1001:1001 /app/apps/web/.next/static      ./apps/web/.next/static
COPY --from=builder --link --chown=1001:1001 /app/apps/web/public            ./apps/web/public
COPY --from=deps    --link --chown=1001:1001 /app/node_modules               ./node_modules
COPY --from=deps    --link --chown=1001:1001 /app/packages/db/node_modules   ./packages/db/node_modules
COPY --from=builder --link --chown=1001:1001 /app/packages/db/drizzle        ./packages/db/drizzle
COPY --from=builder --link --chown=1001:1001 /app/packages/db/src            ./packages/db/src
COPY --link --chown=1001:1001 --chmod=755 docker-entrypoint.sh               ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
