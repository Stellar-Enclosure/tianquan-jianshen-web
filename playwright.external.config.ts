import { defineConfig } from '@playwright/test'

const listing = process.argv.includes('--list')
if (!listing && process.env.STELLAR_PERMISSION_EXTERNAL_ENABLED !== 'true') {
  throw new Error('External acceptance requires explicit authorization and an already running HTTPS environment')
}
if (!listing && !process.env.STELLAR_PERMISSION_EXTERNAL_CONFIG_FILE) {
  throw new Error('An absolute private external fixture file is required')
}

export default defineConfig({
  testDir: './e2e/external',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  outputDir: '.external-results',
  use: {
    ignoreHTTPSErrors: false,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    acceptDownloads: false,
  },
  // This configuration deliberately has no webServer, preview, startup hook, or automatic login.
})
