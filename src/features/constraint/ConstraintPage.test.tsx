vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {target} from '../../test/catalog'
import {TestAuthorizationProvider, createAuthorizationFixtureClient} from '../../test/authorization'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {type Rbac3Client} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {render, screen, waitFor} from '@testing-library/react'
import type {PropsWithChildren} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {type FeatureApiClient, FeatureApiProvider} from '../shared/FeatureApi'
import {ConstraintPage, validateDsdRoleSelection} from './ConstraintPage'
import {constraintApi} from './constraint.api'

const wrapper = ({ children }: PropsWithChildren) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const sdk = createAuthorizationFixtureClient({subject:'constraint-test',tenantId:'42',permissionCodes:['system:authorization-constraint:read'],authVersion:1,policyVersion:1}, {}) as unknown as Rbac3Client
  const api: FeatureApiClient = {
    request: async <T,>() => [{ setId: '9', setCode: 'cashier-maker-checker', constraintType: 'DSD', applicationId: '71', maximumActiveRoles: 1, roleIds: ['1', '2'], status: 'ACTIVE', version: 3 }] as T,
  }
  return (
    <QueryClientProvider client={queryClient}>
        <TestAuthorizationProvider client={sdk}>
        <FeatureApiProvider client={api}>{children}</FeatureApiProvider>
      </TestAuthorizationProvider>
    </QueryClientProvider>
  )
}

describe('constraint page', () => {
  it('uses the IAM policies controller root for every policy collection', async () => {
    const request = vi.fn().mockResolvedValue([])
    const api = constraintApi({request})

    await api.sodSets()
    await api.dataRules(target)
    await api.operationSodRules()
    await api.createSod({
      setCode: 'maker-checker', constraintType: 'SSD', applicationId: '71', maximumActiveRoles: 1,
      memberRoleIds: ['1', '2'], validFrom: '2026-08-29T00:00:00Z', validTo: null, expectedVersion: 0,
    })
    await api.updateSod('9', {
      setCode: 'maker-checker', constraintType: 'DSD', applicationId: '71', maximumActiveRoles: 1,
      memberRoleIds: ['1', '2'], validFrom: '2026-08-29T00:00:00Z', validTo: null, expectedVersion: 3,
    })
    await api.savePrerequisites('2', {groupCode: 'approval', matchMode: 'ALL', prerequisiteRoleIds: ['1'], expectedRoleVersion: 4})
    await api.saveCardinality('2', {scopeType: 'ORG', maximumActive: 2, validFrom: '2026-08-29T00:00:00Z', validTo: null, expectedVersion: 5})
    await api.createDataRule({
      target, applicationId: '71', roleId: '2', permissionId: '91', scopeType: 'ORG', directorySnapshotVersion: null,
      references: [{referenceType: 'ORG', referenceId: '1001'}], validFrom: '2026-08-29T00:00:00Z', validTo: null, expectedVersion: 0,
    })
    await api.updateDataRule('11', {
      target, applicationId: '71', roleId: '2', permissionId: '91', scopeType: 'ORG', directorySnapshotVersion: null,
      references: [{referenceType: 'ORG', referenceId: '1001'}], validFrom: '2026-08-29T00:00:00Z', validTo: null, expectedVersion: 2,
    })
    await api.createOperationSodRule({applicationCode: 'orders', businessResource: 'invoice', priorActionCode: 'CREATE', forbiddenLaterActionCode: 'APPROVE', lookbackFrom: null, validFrom: '2026-08-29T00:00:00Z', validTo: null, expectedVersion: 0})
    await api.updateOperationSodRule('13', {applicationCode: 'orders', businessResource: 'invoice', priorActionCode: 'CREATE', forbiddenLaterActionCode: 'APPROVE', lookbackFrom: null, validFrom: '2026-08-29T00:00:00Z', validTo: null, expectedVersion: 2})

    expect(request).toHaveBeenNthCalledWith(1, '/api/tianquan-jianshen/v1/iam/policies/sod-sets')
    expect(request).toHaveBeenNthCalledWith(2, '/api/tianquan-jianshen/v1/iam/policies/data-rules', {query: {...target}})
    expect(request).toHaveBeenNthCalledWith(3, '/api/tianquan-jianshen/v1/iam/policies/operation-sod-rules')
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/policies/sod-sets', expect.objectContaining({method: 'POST'}))
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/policies/sod-sets/9', expect.objectContaining({method: 'PUT'}))
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/policies/roles/2/prerequisite-groups', expect.objectContaining({method: 'POST'}))
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/policies/roles/2/cardinality', expect.objectContaining({method: 'PUT'}))
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/policies/data-rules', expect.objectContaining({method: 'POST'}))
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/policies/data-rules/11', expect.objectContaining({method: 'PUT'}))
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/policies/operation-sod-rules', expect.objectContaining({method: 'POST'}))
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/policies/operation-sod-rules/13', expect.objectContaining({method: 'PUT'}))
  })

  it('renders DSD as an activation-time constraint', async () => {
    render(<ConstraintPage />, { wrapper })
    await waitFor(() => expect(screen.getByText('cashier-maker-checker')).toBeInTheDocument())
    expect(screen.getByRole('columnheader', { name: '激活根角色' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', {name: /字段规则/})).not.toBeInTheDocument()
  })

  it('accepts only activation roots from one application', () => {
    expect(validateDsdRoleSelection([
      { roleId: '1', applicationId: '71', roleType: 'ACTIVATION_ROOT' },
      { roleId: '2', applicationId: '71', roleType: 'BUSINESS' },
    ])).toBe('DSD_ROLE_MUST_BE_ACTIVATION_ROOT')
    expect(validateDsdRoleSelection([
      { roleId: '1', applicationId: '71', roleType: 'ACTIVATION_ROOT' },
      { roleId: '3', applicationId: '72', roleType: 'ACTIVATION_ROOT' },
    ])).toBe('DSD_ROLES_MUST_SHARE_APPLICATION')
  })
})

it('reads data rules only for the full selected catalog target and locks existing rule identity', async () => {
  const {catalogWrapper, defaultCatalogResponse} = await import('../../test/catalog')
  const {fireEvent} = await import('@testing-library/react')
  const test = catalogWrapper((path, options) => path.endsWith('/data-rules')
    ? [{ruleId: '11', target, applicationId: '71', roleId: '301', permissionId: '201', scopeType: 'ORG', references: [{referenceType: 'ORG', referenceId: '1001'}], status: 'ACTIVE', version: 2}]
    : defaultCatalogResponse(path, options), ['system:data-rule:read', 'system:data-rule:manage', 'system:permission-catalog:read'])
  render(<ConstraintPage />, test)
  await screen.findByText('ORG:1001')
  expect(test.request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/policies/data-rules', {query: {...target}})
  expect(test.request).not.toHaveBeenCalledWith(expect.stringMatching(/sod-sets|operation-sod-rules/), expect.anything())
  fireEvent.click(screen.getByRole('button', {name: /编\s*辑/}))
  expect(screen.getByLabelText('应用 ID（由目录范围绑定）')).toBeDisabled()
  expect(screen.getByLabelText('角色 ID')).toBeDisabled()
  expect(screen.getByLabelText('权限 ID（当前目录）')).toBeDisabled()
})

it('does not query a catalog or unrelated constraint collections for a SOD-only reader', async () => {
  const {catalogWrapper} = await import('../../test/catalog')
  const test = catalogWrapper(path => {if (path.endsWith('/sod-sets')) return []; throw new Error('Unexpected read')}, ['system:authorization-constraint:read'])
  render(<ConstraintPage />, test)
  await waitFor(() => expect(test.request).toHaveBeenCalledTimes(1))
  expect(test.request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/policies/sod-sets', {})
})
