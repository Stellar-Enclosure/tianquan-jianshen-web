import {describe, expect, it, vi} from 'vitest'
import {ApiError, AuthRequestContext, classifyApiError} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {createAdminApiClients} from './adminApiClient'
import {subscribeAuthorizationFailure} from '../features/auth/gatewayAuth'

const connect = (fetcher: typeof fetch) => {
  const context = new AuthRequestContext()
  const invalidate = vi.fn(() => context.invalidate())
  const clients = createAdminApiClients({
    context, identity: async () => undefined,
    authority: () => ({
      context, invalidate, apiBaseUrl: 'https://jianshen.example.invalid', resource: 'https://jianshen.example.invalid/resource',
      authorizationHeader: () => 'Bearer fixture',
    }),
  }, fetcher)
  return {clients, context, invalidate}
}


describe('RBAC admin error envelopes', () => {
  it.each([
    [400, {success: false, code: 400, status: 'REQUEST_INVALID', message: 'Request payload is invalid', traceId: 'trace-1', data: null}, 'REQUEST_INVALID', 'Request payload is invalid', 'server'],
    [403, {success: false, code: 403, status: 'MANAGEMENT_POLICY_DENIED', message: 'Request rejected by authorization policy', traceId: 'trace-1', data: null}, 'MANAGEMENT_POLICY_DENIED', 'Request rejected by authorization policy', 'permission'],
    [409, {error: {code: 'AUTH_MUTATION_CONFLICT', message: 'Conflict', retryable: false}, meta: {traceId: 'trace-1'}}, 'AUTH_MUTATION_CONFLICT', 'Conflict', 'validation'],
  ])('preserves the error code and message for HTTP %s', async (status, body, code, message, type) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {status: status as number}))
    const {featureClient} = connect(fetcher).clients
    const error = await featureClient.request('/api/tianquan-jianshen/v1/users/42/role-assignments').catch(value => value)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({status, code, message, requestId: 'trace-1'})
    expect(classifyApiError(error).type).toBe(type)
    expect(classifyApiError(error).title).not.toBe('未知错误')
  })

  it('retains the decision identifier returned with an authorization denial', async () => {
    const id = '12345678-1234-4234-8234-123456789abc'
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({code: 'AUTHORIZATION_DENIED'}),
      {status: 403, headers: {'X-Permission-Decision-Id': id}}))
    const error = await connect(fetcher).clients.featureClient.request('/api/v1/example').catch(value => value)
    expect(error).toMatchObject({status: 403, code: 'AUTHORIZATION_DENIED', decisionId: id})
  })
  it('retains the explicit role challenge and does not retry the write', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({status: 'STEP_UP_REQUIRED'}, {status: 401}))
    const {clients, invalidate} = connect(fetcher)
    await expect(clients.rbac3Client.replaceActiveRoles({roleIds: ['1'], expectedAuthVersion: 2}))
      .rejects.toMatchObject({status: 401, code: 'STEP_UP_REQUIRED'})
    expect(invalidate).not.toHaveBeenCalled()
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it.each([401, 403, 503])('reports status %s without replay or session eviction on transient failure', async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({status: 'ACCESS_DENIED'}, {status}))
    const {clients, invalidate} = connect(fetcher)
    const notified = vi.fn()
    const unsubscribe = subscribeAuthorizationFailure(notified)
    try {
      await expect(clients.featureClient.request('/api/v1/example', {method: 'PUT', body: {value: 3}}))
        .rejects.toMatchObject({status})
      expect(invalidate).toHaveBeenCalledTimes(status === 401 ? 1 : 0)
      expect(notified.mock.calls).toEqual(status === 503 ? [] : [[status]])
      expect(fetcher).toHaveBeenCalledOnce()
    } finally {
      unsubscribe()
    }
  })

  it('rejects a response that arrives after logout even if fetch ignores abort', async () => {
    let release!: (value: Response) => void
    const fetcher = vi.fn<typeof fetch>(() => new Promise(resolve => {release = resolve}))
    const {clients, context} = connect(fetcher)
    const request = clients.featureClient.request('/api/v1/example')
    context.invalidate()
    release(Response.json({success: true, data: 'previous authorization'}))
    await expect(request).rejects.toHaveProperty('name', 'AbortError')
  })
})
