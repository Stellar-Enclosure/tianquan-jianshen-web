vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {TestAuthorizationProvider, createAuthorizationFixtureClient} from '../../test/authorization'
import {type Rbac3Client} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import type {PropsWithChildren} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {type FeatureApiClient, type FeatureApiRequest, FeatureApiProvider} from '../shared/FeatureApi'
import {AuditLogPage} from './AuditLogPage'
import type {AuditPage} from './audit.api'

const request = vi.fn<(...args: [string, FeatureApiRequest?]) => Promise<AuditPage>>(async () => ({ items: [{
    id: '601', tenantId: '9', eventType: 'AUTHORIZATION_DENIED_DIAGNOSTIC', outcome: 'DENIED', severity: 'WARN', actorType: 'USER', actorId: '7',
    targetType: 'RESOURCE', targetId: 'orders.list', reasonCode: 'OAUTH_SCOPE_DENIED', requestId: 'decision-1', traceId: 'trace-1',
    beforeSnapshot: { password: 'should-not-render', status: 'ACTIVE' }, afterSnapshot: {
      token: 'should-not-render', resourceKey: 'orders.list', requirement: { mode: 'ALL', codes: ['orders:read'] },
      catalogVersion: '4', authVersion: '5', policyVersion: '6', snapshotAt: '2026-08-01T00:00:00Z',
      producer: { producerId: 'orders-java', producerVersion: '2', manifestDigest: 'manifest-proof' },
      rootRoleIds: ['40'], effectiveRoleIds: ['50'], missingResourceScopes: ['api:read'],
      permissionFacts: [{ code: 'orders:read', granted: true, scopeQualified: false, scopeMappingConfigured: true, missingScopes: ['read:scope'] }],
      permissionSourceStatus: 'VERIFIED', rolesByPermission: { 'orders:read': ['50'] },
    },
    payloadChecksum: 'checksum', createdAt: '2026-08-01T00:00:00Z',
  }], nextCursor: null }))

const wrapper = ({ children }: PropsWithChildren) => {
    const sdk = createAuthorizationFixtureClient({subject:'audit-test',tenantId:'9',permissionCodes:['system:audit:read'],authVersion:1,policyVersion:1}, {}) as unknown as Rbac3Client
  const api = { request } as unknown as FeatureApiClient
    return <QueryClientProvider client={new QueryClient()}><TestAuthorizationProvider client={sdk}><FeatureApiProvider
        client={api}>{children}</FeatureApiProvider></TestAuthorizationProvider></QueryClientProvider>
}

describe('audit log page', () => {
  it('uses server filters and redacts sensitive structured values in detail', async () => {
    render(<AuditLogPage />, { wrapper })
    await waitFor(() => expect(screen.getByText('AUTHORIZATION_DENIED_DIAGNOSTIC')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('决策编号'), { target: { value: 'decision-1' } })
    fireEvent.click(screen.getByRole('button', { name: '应用服务端过滤' }))
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/audit-logs', expect.objectContaining({
      query: expect.objectContaining({ requestId: 'decision-1' }),
    })))
    const lastRequest = request.mock.calls.at(-1)?.[1] as { query?: Record<string, unknown> } | undefined
    expect(lastRequest?.query).not.toHaveProperty('tenantId')
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }))
    expect(await screen.findAllByText('[REDACTED]')).toHaveLength(2)
    expect(document.body.textContent).not.toContain('should-not-render')
    expect(screen.getAllByText('trace-1').length).toBeGreaterThan(0)
    expect(screen.getByText('拒绝诊断')).toBeInTheDocument()
    expect(screen.getByText('4 / 5 / 6')).toBeInTheDocument()
    expect(screen.getByText('权限 orders:read')).toBeInTheDocument()
    expect(screen.getByText(/直接授予角色/)).toHaveTextContent('["50"]')
    expect(screen.getAllByText(/manifest-proof/).length).toBeGreaterThan(0)
  })

  it('marks changed authorization versions as unverified instead of presenting current roles as history', async () => {
    const data = await request('/fixture')
    request.mockResolvedValueOnce({ ...data, items: data.items.map((item) => ({ ...item, afterSnapshot: {
      ...item.afterSnapshot, permissionSourceStatus: 'POLICY_VERSION_CHANGED', rolesByPermission: {},
    } })) })
    render(<AuditLogPage />, { wrapper })
    await screen.findByText('AUTHORIZATION_DENIED_DIAGNOSTIC')
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }))
    expect(await screen.findByText('权限来源未核实')).toBeInTheDocument()
    expect(screen.getByText(/直接授予角色/)).toHaveTextContent('未核实')
  })

  it('keeps older audit records readable without assuming diagnostic fields', async () => {
    const data = await request('/fixture')
    request.mockResolvedValueOnce({ ...data, items: data.items.map((item) => ({ ...item, eventType: 'ROLE_CHANGED' })) })
    render(<AuditLogPage />, { wrapper })
    await screen.findByText('ROLE_CHANGED')
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }))
    expect(await screen.findByText('Before（结构化且脱敏）')).toBeInTheDocument()
    expect(screen.queryByText('拒绝诊断')).not.toBeInTheDocument()
  })

  it('shows the protected field write rule and actual input binding', async () => {
    const data = await request('/fixture')
    request.mockResolvedValueOnce({ ...data, items: data.items.map((item) => ({ ...item, afterSnapshot: {
      ...item.afterSnapshot, decisionKind: 'FIELD_WRITE', decisionDetails: { inputBindingWritable: false },
    } })) })
    render(<AuditLogPage />, { wrapper })
    await screen.findByText('AUTHORIZATION_DENIED_DIAGNOSTIC')
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }))
    expect(await screen.findByText('字段写入规则')).toBeInTheDocument()
    expect(screen.getByText('实际输入绑定可写')).toBeInTheDocument()
  })

  it('explains input binding failures without displaying an unverified field name', async () => {
    const data = await request('/fixture')
    request.mockResolvedValueOnce({ ...data, items: data.items.map((item) => ({ ...item, afterSnapshot: {
      ...item.afterSnapshot, decisionKind: 'FIELD_INPUT', permissionFacts: [], permissionSourceStatus: 'NOT_EVALUATED',
      rolesByPermission: {}, decisionDetails: { fieldKeyAvailable: false, stage: 'INPUT_BINDING' },
    } })) })
    render(<AuditLogPage />, { wrapper })
    await screen.findByText('AUTHORIZATION_DENIED_DIAGNOSTIC')
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }))
    expect(await screen.findByText('字段绑定阶段')).toBeInTheDocument()
    expect(screen.getByText(/未能确认具体声明字段/)).toBeInTheDocument()
  })

  it('labels data scope policy denial as distinct from an object decision', async () => {
    const data = await request('/fixture')
    request.mockResolvedValueOnce({ ...data, items: data.items.map((item) => ({ ...item, afterSnapshot: {
      ...item.afterSnapshot, decisionKind: 'DATA_SCOPE_POLICY', decisionDetails: { scopeType: 'NONE', finalObjectDecision: false },
      dataScopeRules: [{ ruleId: '70', roleId: '50', scopeType: 'DEPT', referenceCount: 0 }],
    } })) })
    render(<AuditLogPage />, { wrapper })
    await screen.findByText('AUTHORIZATION_DENIED_DIAGNOSTIC')
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }))
    expect(await screen.findByText('数据范围策略判定')).toBeInTheDocument()
    expect(screen.getByText(/不代表已经执行逐对象数据范围检查/)).toBeInTheDocument()
    expect(screen.getByText('快照时间匹配的数据规则（无对象引用）')).toBeInTheDocument()
    expect(screen.getAllByText(/"ruleId":"70"/).length).toBeGreaterThan(0)
    expect(screen.getByText(/直接授予角色/)).not.toHaveTextContent('scope 限定')
  })

  it('shows configured and activated artifact checks without inferring role sources', async () => {
    const data = await request('/fixture')
    request.mockResolvedValueOnce({ ...data, items: data.items.map((item) => ({ ...item, afterSnapshot: {
      ...item.afterSnapshot, decisionKind: 'RUNTIME_BINDING', permissionFacts: [], permissionSourceStatus: 'NOT_EVALUATED',
      rolesByPermission: {}, decisionDetails: { failedChecks: ['ARTIFACT_DIGEST_MISMATCH'], configuredProducer: { artifactDigest: 'configured-digest' } },
    } })) })
    render(<AuditLogPage />, { wrapper })
    await screen.findByText('AUTHORIZATION_DENIED_DIAGNOSTIC')
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }))
    expect(await screen.findByText('未通过的绑定检查')).toBeInTheDocument()
    expect(screen.getAllByText(/ARTIFACT_DIGEST_MISMATCH/).length).toBeGreaterThan(0)
    expect(screen.getByText('诊断时间（未生成快照）')).toBeInTheDocument()
    expect(screen.queryByText('权限来源未核实')).not.toBeInTheDocument()
  })
})
