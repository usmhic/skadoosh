import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { ensureDatabaseExists } from "./ensure-db";

async function existingMigrationsFolder() {
  const cwd = process.cwd();
  const candidates = [
    process.env.DRIZZLE_MIGRATIONS_DIR,
    resolve(cwd, "packages/db/drizzle"),          // cwd = monorepo root
    resolve(cwd, "../../packages/db/drizzle"),     // cwd = apps/web (Next.js standalone)
    resolve(cwd, "drizzle"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await access(resolve(candidate, "meta/_journal.json"));
      return candidate;
    } catch {
      // try next
    }
  }

  throw new Error(`Could not find Drizzle migrations. Checked: ${candidates.join(", ")}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireMigrationLock(client: postgres.Sql, lockId: number, lockTimeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt <= lockTimeoutMs) {
    const [row] = await client`select pg_try_advisory_lock(${lockId}) as locked`;
    if (row?.locked === true) return;
    await sleep(1_000);
  }
  throw new Error(`Timed out after ${lockTimeoutMs}ms waiting for the database migration lock.`);
}

export async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");

  await ensureDatabaseExists(connectionString);

  const client = postgres(connectionString, {
    connect_timeout: 10,
    idle_timeout: 5,
    max: 1,
    onnotice: () => undefined,
    prepare: false,
  });

  const migrationsFolder = await existingMigrationsFolder();

  await client`select set_config('statement_timeout', ${"120000"}, false)`;
  await acquireMigrationLock(client, 78_634_641, 60_000);

  try {
    // The migrations folder contains one generated baseline for clean installs.
    // Existing databases must already have this baseline recorded; see the
    // database startup notes in ARCHITECTURE.md before adopting a pre-existing DB.
    await migrate(drizzle(client), { migrationsFolder });
    console.log("[skaddosh] Database migrations completed");
  } finally {
    await client`select pg_advisory_unlock(${78_634_641})`;
    await client.end();
  }
}

// CLI entry point
if (require.main === module) {
  runMigrations().catch(async (error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
