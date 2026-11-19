import {expect, test} from '@playwright/test'
import {about, appBase, approvePublicLogin, installAppFixture, permissionSnapshot} from './fixtures/publicOAuth'

test('an authorized direct Resource view keeps definition, lease and release independent', async ({page}) => {
  const login = await approvePublicLogin(page)
  await installAppFixture(page, async (route, target) => {
    login.checkBusinessRequest(route)
    const runtime = {
      ddcConfigClient: {state: 'READY', configVersions: {}},
      definition: {status: 'ACCEPTED', warnings: []},
      providerLease: {state: 'ACTIVE'},
      gatewayRelease: {status: 'ROUTABLE'}, checkedAt: new Date().toISOString(),
    }
    const payloads: Record<string, unknown> = {
      '/api/v1/authorization/effective-permissions': {...permissionSnapshot, snapshotExpiresAt: new Date(Date.now() + 60_000).toISOString()},
      '/api/v1/auth/about': about,
      '/api/v1/authorization/field-catalog': {
        catalogScope: permissionSnapshot.catalogScope, catalogVersion: permissionSnapshot.catalogVersion, fields: {},
      },
      '/api/tianquan-jianshen/v1/runtime/status': runtime,
      '/api/tianquan-jianshen/v1/runtime/yuheng-tianshu-status': runtime,
      '/api/tianquan-jianshen/v1/runtime/mutations': {items: [], nextCursor: null},
    }
    if (!Object.hasOwn(payloads, target.pathname)) throw new Error('Unexpected Resource path ' + target.pathname)
    await route.fulfill({json: {success: true, data: payloads[target.pathname]}})
  })
  await page.goto(appBase + 'iam/diagnostics/runtime')
  await login.complete()
  await expect(page.getByText('Yuheng Definition', {exact: true})).toBeVisible()
  await expect(page.getByText('Tianshu HTTP Provider Lease', {exact: true})).toBeVisible()
  await expect(page.getByText('Yuheng Release', {exact: true}).first()).toBeVisible()
})
