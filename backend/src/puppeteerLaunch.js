const puppeteer = require("puppeteer");

/**
 * Options for launching Chromium on PaaS (Render, Heroku, etc.): no sandbox,
 * avoid /dev/shm issues. PUPPETEER_EXECUTABLE_PATH overrides the bundled path.
 */
function getLaunchOptions() {
  const opts = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    opts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  return opts;
}

function launchBrowser() {
  return puppeteer.launch(getLaunchOptions());
}

module.exports = { getLaunchOptions, launchBrowser };
