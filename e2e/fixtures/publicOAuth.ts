import {createHash, generateKeyPairSync, sign} from 'node:crypto'
import {expect, type Page, type Route} from '@playwright/test'
import type {PublicOAuthRegistration} from '@stellar-enclosure/stellar-enclosure-web-shared'

export const appOrigin = 'https://jianshen.example.invalid'
export const appBase = '/console/'
export const previewPort = 18155
const issuer = 'https://identity.example.invalid/tenants/1001'
const subject = 'direct-browser-user'
export const publicRegistration: PublicOAuthRegistration = {
  id: 'jianshen-1001', clientId: 'jianshen-1001', tenantId: '1001', browserBound: false,
  issuer, authorizationEndpoint: issuer + '/oauth2/authorize', tokenEndpoint: issuer + '/oauth2/token',
  jwksUri: issuer + '/.well-known/jwks.json', redirectUri: appOrigin + appBase + 'auth/oidc/callback/jianshen-1001',
  popupRedirectUri: appOrigin + appBase + 'auth/oidc/popup/jianshen-1001',
  resource: appOrigin + '/resource', apiBaseUrl: appOrigin, scopes: ['openid', 'system:authorization-runtime:read'],
}

export async function installAppFixture(page: Page, business?: (route: Route, target: URL) => Promise<void>) {
  await page.route(appOrigin + '/**', async route => {
    const target = new URL(route.request().url())
    if (target.pathname.startsWith(appBase) || target.pathname === '/favicon.png') {
      const assetPath = target.pathname === '/favicon.png' ? appBase + 'favicon.png' : target.pathname
      const response = await route.fetch({url: 'http://127.0.0.1:' + previewPort + assetPath})
      await route.fulfill({response})
      return
    }
    if (business && target.pathname.startsWith('/api/')) {
      await business(route, target)
      return
    }
    throw new Error('Unexpected Jianshen request ' + target.pathname)
  })
}

export async function approvePublicLogin(page: Page) {
  const {privateKey, publicKey} = generateKeyPairSync('rsa', {modulusLength: 2048})
  const key = {...publicKey.export({format: 'jwk'}), alg: 'RS256', kid: 'fixture-key'}
  let authorization: URL | undefined
  let accessToken: string | undefined
  let exchanged = false
  await page.route(publicRegistration.authorizationEndpoint + '?*', route => {
    authorization = new URL(route.request().url())
    return route.fulfill({contentType: 'text/html', body: '<html>Disposable IdP fixture</html>'})
  })
  await page.route(publicRegistration.jwksUri, route => route.fulfill({json: {keys: [key]}}))
  await page.route(publicRegistration.tokenEndpoint, async route => {
    expect(exchanged).toBe(false)
    exchanged = true
    const body = new URLSearchParams(route.request().postData() ?? '')
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('fixture-code')
    expect(body.get('redirect_uri')).toBe(publicRegistration.redirectUri)
    expect(body.get('client_id')).toBe(publicRegistration.clientId)
    expect(body.has('client_secret')).toBe(false)
    expect(route.request().headers()).not.toHaveProperty('cookie')
    expect(createHash('sha256').update(body.get('code_verifier') ?? '').digest('base64url'))
      .toBe(authorization?.searchParams.get('code_challenge'))
    const now = Math.floor(Date.now() / 1000)
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const token = (typ: string, claims: Record<string, unknown>) => {
      const unsigned = encode({typ, alg: 'RS256', kid: 'fixture-key'}) + '.'
        + encode({iss: issuer, sub: subject, iat: now, exp: now + 300, ...claims})
      return unsigned + '.' + sign('sha256', Buffer.from(unsigned), privateKey).toString('base64url')
    }
    const idToken = token('JWT', {aud: [publicRegistration.clientId], nonce: authorization?.searchParams.get('nonce')})
    accessToken = token('at+jwt', {aud: [publicRegistration.resource], client_id: publicRegistration.clientId,
      tenant_id: publicRegistration.tenantId, principal_type: 'USER', scope_context: 'TENANT', scope: publicRegistration.scopes.join(' ')})
    await route.fulfill({json: {id_token: idToken, access_token: accessToken, token_type: 'Bearer', expires_in: 300}})
  })
  return {
    async complete() {
      await page.getByRole('button', {name: '使用统一身份登录'}).click()
      await expect.poll(() => authorization?.origin).toBe(new URL(issuer).origin)
      const params = authorization!.searchParams
      expect(params.get('code_challenge_method')).toBe('S256')
      expect(params.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(params.get('state')).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(params.get('resource')).toBe(publicRegistration.resource)
      expect(params.get('redirect_uri')).toBe(publicRegistration.redirectUri)
      expect(params.has('client_secret')).toBe(false)
      const callback = new URL(publicRegistration.redirectUri)
      callback.search = new URLSearchParams({code: 'fixture-code', state: params.get('state')!, iss: issuer}).toString()
      await page.goto(callback.href)
    },
    checkBusinessRequest(route: Route) {
      expect(accessToken).toBeDefined()
      expect(route.request().headers().authorization === 'Bearer ' + accessToken).toBe(true)
      expect(route.request().headers()).not.toHaveProperty('cookie')
    },
  }
}

export const permissionSnapshot = {
  issuer, subject, catalogVersion: '1', authVersion: '1', policyVersion: '1',
  catalogScope: {catalogScopeId: '101', tenantId: publicRegistration.tenantId, businessCode: 'xingyuan',
    applicationCode: 'tianquan-jianshen', namespaceCode: 'default', environment: 'test'},
  activeRoleContext: {applicationCode: 'tianquan-jianshen', rootRoleIds: ['1'], effectiveRoleIds: ['1']},
  permissionCodes: ['system:authorization-runtime:read'],
}
export const about = {user: {subject, tenantId: publicRegistration.tenantId, status: 'ACTIVE'},
  currentApplicationCode: 'tianquan-jianshen', activeRoles: [], landingRouteCode: null, authVersion: 1, policyVersion: 1}
