import {expect, test} from '@playwright/test'
import {appBase, installAppFixture} from './fixtures/publicOAuth'

test('anonymous navigation makes no authorization or business API request', async ({page}) => {
  const unexpected: string[] = []
  page.on('request', request => {
    const {pathname} = new URL(request.url())
    if (pathname.startsWith('/api/') || pathname.startsWith('/apps/')) unexpected.push(pathname)
  })
  await installAppFixture(page)
  await page.goto(appBase + 'iam/diagnostics/runtime')
  await expect(page.getByRole('button', {name: '使用统一身份登录'})).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)
  expect(unexpected).toEqual([])
})
