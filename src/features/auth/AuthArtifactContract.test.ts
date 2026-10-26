import {describe, expect, it, vi} from 'vitest'
import * as installedShared from '@stellar-enclosure/stellar-enclosure-web-shared'

// Exercise the actual installed tarball rather than replacing the shared transport with a mock.
describe('installed application authentication artifact', () => {
  it('opens the fixed application login without token fetching or issuer selection', () => {
    const fetcher = vi.fn<typeof fetch>()
    const navigate = vi.fn()
    const client = installedShared.createGatewayAuthClient({baseUrl: 'https://edge.example', appAlias: 'edge-jianshen', fetch: fetcher, navigate})
    client.login()
    expect(navigate).toHaveBeenCalledWith('https://edge.example/apps/edge-jianshen/auth/login')
    expect(fetcher).not.toHaveBeenCalled()
    expect(installedShared).not.toHaveProperty('createOAuthClient')
    expect(installedShared).not.toHaveProperty('createTokenStore')
    expect(installedShared).not.toHaveProperty('decodeTokenPayload')
  })
  it.each(['CONFIRMED', 'PENDING', 'UNKNOWN'] as const)('preserves the explicit logout remote state %s', async remoteState => {
    const result = {operationId: '11111111-1111-1111-1111-111111111111', status: 'LOCAL_CLOSED', remoteState, ssoLogoutUri: 'https://identity.example/tenants/1001/logout'}
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({headerName: 'X-CSRF-TOKEN', token: 'csrf-challenge', expiresAt: new Date(Date.now() + 60_000).toISOString()})))
      .mockResolvedValueOnce(new Response(JSON.stringify(result), {status: 202}))
    const client = installedShared.createGatewayAuthClient({appAlias: 'edge-jianshen', fetch: fetcher, navigate: vi.fn()})
    await expect(client.logout()).resolves.toEqual(result)
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/apps/edge-jianshen/auth/csrf', '/apps/edge-jianshen/auth/logout'])
    const request = fetcher.mock.calls[1][1]!
    expect(request.method).toBe('POST')
    expect(new Headers(request.headers).get('X-CSRF-TOKEN')).toBe('csrf-challenge')
    expect(request.body).toBeUndefined()
  })
  it('does not send logout after an invalid CSRF proof', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({headerName: 'unsafe', token: ''})))
    const client = installedShared.createGatewayAuthClient({fetch: fetcher, navigate: vi.fn()})
    await expect(client.logout()).rejects.toMatchObject({code: 'CSRF_FAILED'})
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
