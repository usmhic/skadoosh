import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

// Lazily initialise the connection so that importing this module during a
// Next.js production build (when DATABASE_URL is not needed) does not throw.
// The error surfaces on first actual query instead of at module load time.
let _db: DrizzleDB | undefined;

function getDb(): DrizzleDB {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured. Set it in the root .env file.");
  }
  const client = postgres(connectionString, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop) {
    return getDb()[prop as keyof DrizzleDB];
  },
});

export type DB = DrizzleDB;
export * from "./schema";
