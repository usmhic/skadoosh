#!/usr/bin/env node

import { spawn } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(__dirname, "..");
const envFile = join(rootDir, ".env");

// Load .env file
function loadEnv() {
  try {
    const content = readFileSync(envFile, "utf-8");
    const env = {};

    content.split("\n").forEach((line) => {
      // Skip comments and empty lines
      if (!line || line.startsWith("#")) return;

      const [key, ...valueParts] = line.split("=");
      if (key) {
        let value = valueParts.join("=").trim();
        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        env[key.trim()] = value;
      }
    });

    return env;
  } catch (error) {
    console.warn(`[skaddosh] Warning: Could not read .env file: ${error.message}`);
    return {};
  }
}

// Load environment from root .env
const envVars = loadEnv();
delete envVars.NODE_ENV;

// Merge with existing process.env (existing env vars take precedence)
const childEnv = { ...envVars, ...process.env };

// Get command and arguments
const [, , ...args] = process.argv;

if (args.length === 0) {
  console.error("Usage: with-root-env.mjs <command> [args...]");
  process.exit(1);
}

// Spawn the child process with merged environment
const childProcess = spawn(args[0], args.slice(1), {
  env: childEnv,
  stdio: "inherit",
  shell: true,
});

// Forward exit code
childProcess.on("exit", (code) => {
  process.exit(code ?? 0);
});

// Handle errors
childProcess.on("error", (error) => {
  console.error(`[skaddosh] Error executing command: ${error.message}`);
  process.exit(1);
});
