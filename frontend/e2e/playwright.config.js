/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  timeout: 120000,
  testDir: './',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
};
