vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {TestAuthorizationProvider, createAuthorizationFixtureClient} from '../../test/authorization'
import {type Rbac3Client} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {ApiError} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {render, screen, waitFor} from '@testing-library/react'
import type {PropsWithChildren} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {type FeatureApiClient, FeatureApiProvider} from '../shared/FeatureApi'
import {RuntimeStatusPage} from './RuntimeStatusPage'

const wrapperFor = (statusReadFails = false) => ({children}: PropsWithChildren) => {
    const sdk = createAuthorizationFixtureClient({subject:'runtime-test',tenantId:'9',permissionCodes:['system:authorization-runtime:read', 'system:authorization-runtime:operate'],authVersion:1,policyVersion:1}, {}) as unknown as Rbac3Client
  const status = {
    ddcConfigClient: { state: 'READY', instanceId: 'tianquan-jianshen-1', leaseIdFingerprint: 'af0130b1190e', leaseExpireAt: '2026-08-01T00:00:30Z', configVersions: { 'tianquan-jianshen.maximum-active-roots': 7 }, lastApplyFailureKey: null, lastApplyFailureVersion: null, lastApplyFailureCode: null },
    definition: { status: 'ACCEPTED', definitionSetId: 'definition-7', warnings: [] },
    providerLease: { state: 'RECOVERING', instanceId: 'tianquan-jianshen-1', leaseExpireAt: null },
    gatewayRelease: { releaseId: null, status: 'MISSING', observedByEngineVersion: null }, checkedAt: '2026-08-01T00:00:00Z',
    flyway: { rbac3History: 'UP_TO_DATE', outboxHistory: 'UP_TO_DATE' }, redisProjection: { state: 'DEGRADED', checkpointLag: 3 },
    fence: { state: 'STALE', oldestAgeSeconds: 90 }, outbox: { state: 'LAGGING', pendingCount: 12, oldestAgeSeconds: 30 },
  }
  const api: FeatureApiClient = { request: async <T,>(path: string) => {
    if (statusReadFails && path.endsWith('/runtime/status')) throw new ApiError('unavailable', 503, 'AUTH_RUNTIME_UNAVAILABLE')
    return (path.includes('/mutations') ? { items: [{ mutationId: '701', scopeType: 'USER', scopeId: '7', commandId: 'cmd-1', status: 'RECOVERY_REQUIRED', attempt: 2, lastErrorCode: 'REDIS_UNAVAILABLE', updatedAt: '2026-08-01T00:00:00Z' }], nextCursor: null } : status) as T
  } }
    return <QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}><TestAuthorizationProvider client={sdk}><FeatureApiProvider
        client={api}>{children}</FeatureApiProvider></TestAuthorizationProvider></QueryClientProvider>
}

const wrapper = wrapperFor()

describe('runtime status page', () => {
  it('keeps definition lease release and recovery subsystems independent', async () => {
    render(<RuntimeStatusPage />, { wrapper })
    await waitFor(() => expect(screen.getAllByText('ACCEPTED').length).toBeGreaterThanOrEqual(1))
    expect(screen.getByText('Tianshu Config Client')).toBeInTheDocument()
    expect(screen.getByText('READY')).toBeInTheDocument()
    expect(screen.getByText(/af0130b1190e/)).toBeInTheDocument()
    expect(screen.getAllByText('RECOVERING').length).toBeGreaterThanOrEqual(1)
    expect((await screen.findAllByText('MISSING')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('LAGGING')).toBeInTheDocument()
    expect(screen.getByText('STALE')).toBeInTheDocument()
    expect(screen.getByText('RECOVERY_REQUIRED · 待恢复')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试 701' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/config-client-lease-secret-value|invalid-secret-like-value|internal storage locator|database statement|endpoint secret/i)
  }, 10_000)

  it('keeps the mutation journal and aggregation available when primary runtime status fails', async () => {
    render(<RuntimeStatusPage />, {wrapper: wrapperFor(true)})
    await screen.findByText('服务暂时不可用，请稍后重试')
    expect(screen.getByText('Yuheng / Tianshu 聚合状态')).toBeInTheDocument()
    expect(await screen.findByRole('button', {name: '重试 701'})).toBeInTheDocument()
    expect(screen.queryByText('READY')).not.toBeInTheDocument()
  })

  it('renders the cross-xingyuan Yuheng and Tianshu status projection', async () => {
    render(<RuntimeStatusPage />, { wrapper })
    await waitFor(() => expect(screen.getByText('Yuheng / Tianshu 聚合状态')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '刷新聚合状态' })).toBeInTheDocument()
    expect((await screen.findAllByText('MISSING')).length).toBeGreaterThanOrEqual(1)
  })
})
