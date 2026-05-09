/**
 * Installs a headless Chromium build into backend/.puppeteer-cache (see server.js).
 * Skips when using system Chromium (Docker / PUPPETEER_EXECUTABLE_PATH).
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const cacheDir = path.join(root, ".puppeteer-cache");

if (process.env.PUPPETEER_SKIP_DOWNLOAD === "true" || process.env.PUPPETEER_EXECUTABLE_PATH) {
  console.log("puppeteer-install: skipping (PUPPETEER_SKIP_DOWNLOAD or PUPPETEER_EXECUTABLE_PATH)");
  process.exit(0);
}

const env = { ...process.env, PUPPETEER_CACHE_DIR: cacheDir };
const result = spawnSync(
  "npx",
  ["--yes", "puppeteer", "browsers", "install", "chrome-headless-shell"],
  { cwd: root, env, stdio: "inherit", shell: true }
);

process.exit(result.status === null ? 1 : result.status);
