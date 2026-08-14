const { getDefaultConfig } = require("expo/metro-config");
const exclusionListModule = require("metro-config/private/defaults/exclusionList");
const path = require("path");
const exclusionList = exclusionListModule.default ?? exclusionListModule;

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
const escapePathForRegex = (filePath) => filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Watch all workspace packages
config.watchFolders = [monorepoRoot];

// Resolve hoisted packages from root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.blockList = exclusionList([
  new RegExp(`${escapePathForRegex(path.resolve(monorepoRoot, "apps/web/.next"))}[/\\\\].*`),
]);

// Honor package.json "exports" maps — required for better-auth, and any other
// modern ESM-only packages that only expose subpaths via exports fields.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
