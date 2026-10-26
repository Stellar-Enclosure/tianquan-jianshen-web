import {expect, test} from '@playwright/test'

test('contract fixture: Jianshen login redirects to the configured OIDC registration without credentials', async ({page}) => {
    await page.route('**/apps/edge-jianshen/auth/identity', (route) => route.fulfill({
        status: 401,
        json: {
            error: {code: 'AUTHENTICATION_REQUIRED', message: 'login', retryable: false, details: []},
            meta: {requestId: 'e2e', traceId: 'e2e', timestamp: new Date().toISOString()}
        },
    }))
    await page.route('**/apps/edge-jianshen/auth/login**', (route) => route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html>OIDC fixture</html>',
    }))
  await page.goto('/')
    const login = page.getByRole('button', {name: '使用统一身份登录'})
    await expect(login).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await login.click()
    await expect(page).toHaveURL(/\/apps\/edge-jianshen\/auth\/login(?:\?|$)/)
})
