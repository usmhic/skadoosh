import postgres from "postgres";

/**
 * Creates the target Postgres database if it doesn't exist yet, by connecting to the
 * "postgres" maintenance database first (you can't check for a database's existence
 * from inside a connection to it). Shared by the CLI entry point below (used by the
 * `db:push` dev script) and by migrate.ts's `runMigrations()` (used at container start).
 */
export async function ensureDatabaseExists(connectionString: string): Promise<void> {
  const url = new URL(connectionString);
  const dbName = url.pathname.slice(1);
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const client = postgres(adminUrl.toString(), { max: 1, connect_timeout: 5 });
  try {
    const exists = await client`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (exists.length === 0) {
      console.log(`[skaddosh] Creating database "${dbName}"...`);
      await client.unsafe(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`[skaddosh] ✓ Database "${dbName}" created.`);
    }
  } catch (err) {
    console.warn(`[skaddosh] Could not auto-create database: ${(err as Error).message}`);
  } finally {
    await client.end();
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("[skaddosh] DATABASE_URL not set — skipping DB ensure.");
    return;
  }
  await ensureDatabaseExists(connectionString);
}

// CLI entry point
if (require.main === module) {
  main().catch(console.error);
}
