import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const runner = fileURLToPath(new URL("./ci-check.mjs", import.meta.url));
const root = fileURLToPath(new URL("../", import.meta.url));
for (const code of [0, 7]) {
  test(`preserves exit ${code}, redacts split secrets, and writes a summary`, () => {
    const label = `runner-test-${process.pid}-${code}`;
    const log = resolve(root, `ci-logs/${label}.log`);
    const summary = resolve(root, `ci-logs/${label}.md`);
    const secret = "test-only-sensitive-value";
    try {
      const result = spawnSync(
        process.execPath,
        [
          runner,
          label,
          process.execPath,
          "-e",
          `process.stdout.write('test-only-'); setTimeout(() => { process.stderr.write('diagnostic\\n'); process.stdout.write('sensitive-value\\n'); process.exitCode = ${code}; }, 30);`,
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            TEST_SECRET: secret,
            GITHUB_STEP_SUMMARY: summary,
          },
          windowsHide: true,
        },
      );
      assert.equal(result.status, code, result.stderr);
      const evidence = readFileSync(log, "utf8");
      assert.ok(evidence.includes("diagnostic"));
      assert.ok(evidence.includes("[REDACTED]"));
      assert.ok(!evidence.includes(secret));
      assert.ok(!result.stdout.includes(secret));
      assert.ok(
        readFileSync(summary, "utf8").includes(code === 0 ? "PASS" : "FAIL"),
      );
    } finally {
      rmSync(log, { force: true });
      rmSync(summary, { force: true });
    }
  });
}
