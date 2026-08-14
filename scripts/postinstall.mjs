import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const hasEnvFile = existsSync(".env");
const envFile = hasEnvFile ? readFileSync(".env", "utf8") : "";
const skipFromEnvFile = /^\s*SKIP_DB_PREPARE\s*=\s*["']?true["']?\s*$/im.test(
  envFile,
);
const shouldSkip =
  process.env.CI ||
  process.env.NODE_ENV === "production" ||
  process.env.SKIP_DB_PREPARE?.toLowerCase() === "true" ||
  skipFromEnvFile;

if (shouldSkip) process.exit(0);

if (!hasEnvFile) {
  console.log(
    "[skaddosh] Skipping database preparation until .env exists. Run pnpm db:prepare after configuring it.",
  );
  process.exit(0);
}

const result = spawnSync("pnpm", ["db:prepare"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
