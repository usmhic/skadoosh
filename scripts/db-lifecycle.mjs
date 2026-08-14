import { spawnSync } from "node:child_process";

const mode = process.argv[2];

function run(script) {
  const result = spawnSync("pnpm", [script], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  return result.status ?? 1;
}

if (mode === "sync") {
  const status = run("db:push");
  if (status !== 0) {
    console.warn(
      "[skaddosh] db:push failed (likely local schema drift). Continuing with seed.",
    );
  }
  process.exit(0);
}

if (mode === "deploy") {
  const migrationStatus = run("db:migrate");
  if (migrationStatus !== 0) process.exit(migrationStatus);

  if (process.env.RUN_SEED?.toLowerCase() === "true") {
    process.exit(run("db:seed"));
  }

  console.log("[skaddosh] Skipping seed (set RUN_SEED=true to seed demo data).");
  process.exit(0);
}

console.error("[skaddosh] Expected lifecycle mode: sync or deploy.");
process.exit(1);
