import {defineConfig} from '@playwright/test'
import {appBase, appOrigin, previewPort, publicRegistration} from './e2e/fixtures/publicOAuth'

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/external/**'],
  outputDir: '.generated/playwright-results',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {baseURL: appOrigin, trace: 'retain-on-failure', serviceWorkers: 'block'},
  webServer: {
    command: 'npm run build && npm exec --offline vite -- preview --host 127.0.0.1 --strictPort --port ' + previewPort,
    url: 'http://127.0.0.1:' + previewPort + appBase,
    reuseExistingServer: false,
    env: {
      VITE_BASE_PATH: appBase,
      VITE_PERMISSION_NAMESPACE: 'default',
      VITE_PERMISSION_ENVIRONMENT: 'test',
      VITE_TIANQUAN_JIANSHEN_OAUTH_CONFIG: JSON.stringify({
        webOrigin: appOrigin, apiBaseUrl: appOrigin, resource: publicRegistration.resource,
        activeResource: publicRegistration.id, registrations: [publicRegistration],
      }),
    },
  },
})
