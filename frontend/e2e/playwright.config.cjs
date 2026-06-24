/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  timeout: 120000,
  testDir: './',
  webServer: {
    // Start Vite directly to avoid npm wrapper issues
    command: 'npx vite --host 127.0.0.1 --port 5173',
    port: 5173,
    timeout: 120000,
    reuseExistingServer: false,
    cwd: require('path').resolve(__dirname, '..'),
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
};
