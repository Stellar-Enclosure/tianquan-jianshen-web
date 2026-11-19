import {webcrypto} from 'node:crypto'
import type {PublicOAuthRegistration} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {expect, it, vi} from 'vitest'
import {createJianshenAuth} from './gatewayAuth'

const webOrigin = 'https://jianshen.example.invalid'
const base = '/console/'
const resource = webOrigin + '/resource'
const registration = (tenantId: string): PublicOAuthRegistration => {
  const issuer = 'https://identity.example.invalid/tenants/' + tenantId
  const id = 'jianshen-' + tenantId
  return {id, tenantId, clientId: id, issuer, resource, apiBaseUrl: webOrigin, scopes: ['openid', 'jianshen:read'],
    redirectUri: webOrigin + base + 'auth/oidc/callback/' + id,
    popupRedirectUri: webOrigin + base + 'auth/oidc/popup/' + id,
    authorizationEndpoint: issuer + '/oauth2/authorize', tokenEndpoint: issuer + '/oauth2/token',
    jwksUri: issuer + '/.well-known/jwks.json', browserBound: false}
}
const tenant = registration('20')
const otherTenant = registration('21')
const config = JSON.stringify({webOrigin, activeResource: tenant.id, resource, apiBaseUrl: webOrigin,
  registrations: [tenant, otherTenant]})
const encodeJwtPart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')

it('uses the installed SDK for S256 PKCE and signed Resource authorization without persisted credentials', async () => {
  sessionStorage.clear()
  const fetcher = vi.fn<typeof fetch>()
  const navigate = vi.fn<(url: string) => void>()
  const options = {crypto: webcrypto as unknown as Crypto, sessionStorage, fetch: fetcher, navigate,
    replaceLocation: vi.fn<(url: string) => void>()}
  const browser = {location: {origin: webOrigin}} as Window
  const create = () => createJianshenAuth(config, base, browser, options)
  const start = create()
  const algorithm = 'RSASSA-PKCS1-v1_5'
  const keys = await webcrypto.subtle.generateKey({name: algorithm, modulusLength: 2048, hash: 'SHA-256',
    publicExponent: new Uint8Array([1, 0, 1])}, true, ['verify', 'sign'])
  const publicKey = {...await webcrypto.subtle.exportKey('jwk', keys.publicKey), alg: 'RS256', kid: 'test-key'}
  const now = Math.floor(Date.now() / 1000)
  const sign = async (typ: 'JWT' | 'at+jwt', claims: object) => {
    const content = encodeJwtPart({alg: 'RS256', typ, kid: 'test-key'}) + '.'
      + encodeJwtPart({iss: tenant.issuer, sub: 'verified-user', iat: now, exp: now + 300, ...claims})
    const signature = await webcrypto.subtle.sign(algorithm, keys.privateKey, new TextEncoder().encode(content))
    return content + '.' + Buffer.from(signature).toString('base64url')
  }
  const issue = async (authorization: URL, audience: string) => {
    const id_token = await sign('JWT', {aud: [tenant.clientId], nonce: authorization.searchParams.get('nonce')})
    const access_token = await sign('at+jwt', {aud: [audience], tenant_id: tenant.tenantId,
      client_id: tenant.clientId, principal_type: 'USER', scope_context: 'TENANT', scope: tenant.scopes.join(' ')})
    fetcher.mockResolvedValueOnce(Response.json({id_token, access_token, token_type: 'Bearer', expires_in: 300}))
      .mockResolvedValueOnce(Response.json({keys: [publicKey]}))
    return access_token
  }
  const callbackFor = (authorization: URL) => {
    const callback = new URL(tenant.redirectUri)
    callback.search = new URLSearchParams({state: authorization.searchParams.get('state')!, code: 'test-one-use-code'}).toString()
    return callback.href
  }

  await start.login('/configs')
  const authorization = new URL(navigate.mock.lastCall![0])
  expect(authorization.origin + authorization.pathname).toBe(tenant.authorizationEndpoint)
  expect(authorization.searchParams.get('code_challenge_method')).toBe('S256')
  expect(authorization.searchParams.get('resource')).toBe(resource)
  expect(authorization.searchParams.get('client_id')).toBe(tenant.clientId)
  expect(authorization.searchParams.has('client_secret')).toBe(false)
  const accessToken = await issue(authorization, resource)

  const reloaded = create()
  const callback = callbackFor(authorization)
  const finishing = reloaded.completeCallback(callback, false)
  expect(reloaded.completeCallback(callback, false)).toBe(finishing)
  await expect(finishing).resolves.toBe('/configs')
  await expect(reloaded.identity()).resolves.toMatchObject({tenantId: '20', subject: 'verified-user', resource})
  expect(options.replaceLocation).toHaveBeenCalledWith(tenant.redirectUri)
  await expect(reloaded.completeCallback(callback, false)).rejects.toMatchObject({code: 'INVALID_CALLBACK'})
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([tenant.tokenEndpoint, tenant.jwksUri])

  expect(reloaded.authority().authorizationHeader()).toBe('Bearer ' + accessToken)
  const oldRequest = reloaded.context.capture()
  reloaded.logout()
  expect(oldRequest.signal.aborted).toBe(true)
  expect(navigate).toHaveBeenCalledOnce()
  expect(() => reloaded.authority()).toThrow(expect.objectContaining({status: 401}))
  reloaded.logout(true)
  expect(navigate.mock.lastCall![0]).toBe(tenant.issuer + '/logout')

  await reloaded.login('/')
  const second = new URL(navigate.mock.lastCall![0])
  const wrongIssuer = new URL(callbackFor(second))
  wrongIssuer.searchParams.set('iss', otherTenant.issuer)
  const requests = fetcher.mock.calls.length
  await expect(reloaded.completeCallback(wrongIssuer.href, false)).rejects.toMatchObject({code: 'INVALID_CALLBACK'})
  expect(fetcher).toHaveBeenCalledTimes(requests)
  await reloaded.login('/', {reauthenticate: true})
  const third = new URL(navigate.mock.lastCall![0])
  expect(third.searchParams.get('prompt')).toBe('login')
  await issue(third, webOrigin + '/other-resource')
  await expect(reloaded.completeCallback(callbackFor(third), false)).rejects.toMatchObject({code: 'INVALID_TOKEN'})
  await expect(reloaded.identity()).resolves.toBeUndefined()
  expect(sessionStorage.length).toBe(0)
})

it('accepts only the configured tenant and Resource hints for an embedded popup', async () => {
  const open = vi.fn().mockReturnValue(null)
  const browser = {origin: webOrigin, location: {origin: webOrigin}, open, __POWERED_BY_WUJIE__: true,
    $wujie: {props: {resourceContext: {issuer: otherTenant.issuer, tenantId: '21', resource}}}}
  const auth = createJianshenAuth(config, base, browser as unknown as Window, {crypto: webcrypto as unknown as Crypto})
  expect(auth.standaloneUrl()).toBe(webOrigin + base + 'auth/standalone/' + otherTenant.id)
  await expect(auth.login('/')).rejects.toMatchObject({code: 'POPUP_UNAVAILABLE'})
  expect(open).toHaveBeenCalledTimes(1)

  browser.$wujie.props.resourceContext.resource = webOrigin + '/other-resource'
  await expect(auth.login('/')).rejects.toMatchObject({code: 'INVALID_CONFIGURATION'})
  expect(open).toHaveBeenCalledTimes(1)
  browser.$wujie.props.resourceContext.resource = resource
  browser.origin = 'https://different-portal.example.invalid'
  await expect(auth.login('/')).rejects.toMatchObject({code: 'POPUP_UNAVAILABLE'})
  expect(open).toHaveBeenCalledTimes(1)
  browser.$wujie.props.resourceContext = {issuer: tenant.issuer, tenantId: tenant.tenantId, resource}
  expect(auth.standaloneUrl(true)).toBe(webOrigin + base + 'auth/standalone/' + tenant.id + '?reauthenticate=1')
  await expect(auth.login('/', {reauthenticate: true})).rejects.toMatchObject({code: 'POPUP_UNAVAILABLE'})
  expect(open).toHaveBeenCalledTimes(1)
})

it('selects only an approved same-tenant standalone registration and requests fresh authentication', async () => {
  sessionStorage.clear()
  const navigate = vi.fn<(url: string) => void>()
  const browser = {location: {origin: webOrigin}} as Window
  const auth = createJianshenAuth(config, base, browser, {crypto: webcrypto as unknown as Crypto, sessionStorage, navigate})
  await expect(auth.loginStandalone('unapproved', true)).rejects.toMatchObject({code: 'INVALID_CONFIGURATION'})
  expect(navigate).not.toHaveBeenCalled()
  await auth.loginStandalone(otherTenant.id, true)
  const url = new URL(navigate.mock.lastCall![0])
  expect(url.origin + url.pathname).toBe(otherTenant.authorizationEndpoint)
  expect(url.searchParams.get('prompt')).toBe('login')
  auth.logout()
})
