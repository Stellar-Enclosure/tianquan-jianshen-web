import {expect, test} from '@playwright/test'

test('contract fixture: unauthenticated authorization shows the OIDC login entry', async ({page}) => {
    let identityCount = 0
    await page.route('**/apps/edge-jianshen/auth/identity', async (route) => {
        identityCount += 1
        await route.fulfill({status: 401,
            json: {
                error: {code: 'AUTHENTICATION_REQUIRED', message: 'login required', retryable: false, details: []},
                meta: {requestId: 'e2e', traceId: 'e2e', timestamp: new Date().toISOString()}
            }
        })
  })
  await page.goto('/')
    await expect(page.getByRole('button', {name: '使用统一身份登录'})).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveCount(0)
    expect(identityCount).toBe(1)
})
