import {expect, test} from '@playwright/test'
import {appBase, approvePublicLogin, installAppFixture} from './fixtures/publicOAuth'

test('exchanges the PUBLIC PKCE code and calls the approved Resource without cookies', async ({page}) => {
  const login = await approvePublicLogin(page)
  const paths: string[] = []
  await installAppFixture(page, async (route, target) => {
    login.checkBusinessRequest(route)
    paths.push(target.pathname)
    await route.fulfill({status: 503, json: {status: 'AUTHORITY_UNAVAILABLE'}})
  })
  await page.goto(appBase + 'iam/diagnostics/runtime')
  await login.complete()
  await expect(page).toHaveURL(/\/console\/iam\/diagnostics\/runtime$/)
  await expect(page.getByText('授权服务暂不可用', {exact: true})).toBeVisible()
  expect(paths).toEqual(['/api/v1/authorization/effective-permissions'])
  await page.getByRole('button', {name: '退出鉴身', exact: true}).click()
  await expect(page.getByRole('button', {name: '使用统一身份登录'})).toBeVisible()
  expect(paths).toHaveLength(1)
})
