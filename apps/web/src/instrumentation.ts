export async function register() {
  // Instrumentation runs on every Next.js runtime; DB access is Node.js only.
  if (process.env.NEXT_RUNTIME === "edge") return;

  const migrationsDisabled =
    process.env.SKIP_MIGRATIONS === "true" ||
    process.env.RUN_MIGRATIONS === "false";

  if (!migrationsDisabled) {
    const { runMigrations } = await import("@skaddosh/db/migrate");
    try {
      await runMigrations();
    } catch (error) {
      // A migration failure is fatal — reject startup so the process exits
      // rather than serving requests against an incompatible schema.
      console.error("[skaddosh] Startup migration failed:", error);
      throw error;
    }
  }

  // Seed only in development or when explicitly requested.
  // The seed is fully idempotent (onConflictDoNothing) so it is safe to
  // re-run on every restart.
  const shouldSeed =
    !migrationsDisabled &&
    (process.env.NODE_ENV !== "production" || process.env.RUN_SEED === "true");

  if (shouldSeed) {
    const { runSeed } = await import("@skaddosh/db/seed");
    try {
      await runSeed();
    } catch (error) {
      // Seed failure is non-fatal — log and continue.
      console.error("[skaddosh] Startup seed failed:", error);
    }
  }
}
