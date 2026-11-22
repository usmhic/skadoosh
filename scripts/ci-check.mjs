import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Run a check without a shell, preserving its exit status and useful CI evidence.
const [label, command, ...args] = process.argv.slice(2);
if (!label || !/^[a-z0-9-]+$/.test(label) || !command) {
  throw new Error(
    "Usage: node scripts/ci-check.mjs <label> <command> [args...]",
  );
}
const root = fileURLToPath(new URL("../", import.meta.url));
const directory = resolve(root, "ci-logs");
mkdirSync(directory, { recursive: true });
const log = resolve(directory, `${label}.log`);
writeFileSync(log, `${label}: started ${new Date().toISOString()}\n`);
const secrets = Object.entries(process.env)
  .filter(
    ([key, value]) =>
      /SECRET|PASSWORD|TOKEN|PRIVATE_KEY|DATABASE_URL|CONNECTIONSTRING/i.test(
        key,
      ) && value?.length >= 8,
  )
  .flatMap(([, value]) => [
    value,
    ...value.split(/\r?\n/).filter((line) => line.length >= 8),
  ])
  .sort((a, b) => b.length - a.length);
function record(line) {
  for (const secret of secrets) line = line.replaceAll(secret, "[REDACTED]");
  process.stdout.write(line);
  appendFileSync(log, line.replace(/\x1b\[[0-9;]*m/g, ""));
}
const child = spawn(command, args, {
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
for (const stream of [child.stdout, child.stderr]) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    pending += chunk;
    const lines = pending.split("\n");
    pending = lines.pop();
    for (const line of lines) record(`${line}\n`);
  });
  stream.on("end", () => {
    if (pending) record(`${pending}\n`);
  });
}
child.on("error", (error) => record(`${error.message}\n`));
child.on("close", (code, signal) => {
  const exitCode = code ?? 1;
  const status = `${label}: ${exitCode === 0 ? "PASS" : "FAIL"} (exit ${exitCode}${signal ? `, ${signal}` : ""})`;
  record(`${status}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `- **${status}** — log: \`ci-logs/${label}.log\`\n`,
    );
  }
  process.exitCode = exitCode;
});
