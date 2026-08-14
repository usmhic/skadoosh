#!/bin/sh
set -eu

# Run migrations before starting the application.
# Skipped when SKIP_MIGRATIONS=true or RUN_MIGRATIONS=false.
if [ "${SKIP_MIGRATIONS:-false}" != "true" ] && [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[skaddosh] Running pre-start migrations..."
  ./packages/db/node_modules/.bin/tsx packages/db/src/migrate.ts
fi

# Seed demo data when RUN_SEED=true (opt-in; not enabled by default in production).
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[skaddosh] Running pre-start seed..."
  ./packages/db/node_modules/.bin/tsx packages/db/src/seed.ts
fi

exec "$@"
