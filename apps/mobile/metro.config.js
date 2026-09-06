const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
const escapePathForRegex = (filePath) => filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Watch all workspace packages while retaining Expo's defaults.
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];

// Resolve hoisted packages from root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.blockList = [
  new RegExp(`${escapePathForRegex(path.resolve(monorepoRoot, "apps/web/.next"))}[/\\\\].*`),
];

// Honor package.json "exports" maps — required for better-auth, and any other
// modern ESM-only packages that only expose subpaths via exports fields.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
