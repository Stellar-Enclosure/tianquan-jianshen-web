vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true, usePlainReadFields: () => true}))
import {TestAuthorizationProvider, createAuthorizationFixtureClient} from '../../test/authorization'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {type Rbac3Client} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import type {PropsWithChildren} from 'react'
import {MemoryRouter} from 'react-router-dom'
import {ApiError} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {describe, expect, it, vi} from 'vitest'
import {type FeatureApiClient, type FeatureApiRequest, FeatureApiProvider} from '../shared/FeatureApi'
import {RoleGraphPage} from './RoleGraphPage'
import {roleApi} from './role.api'

const createWrapper = (detailRequest?: (request?: FeatureApiRequest) => Promise<unknown>) => ({children}: PropsWithChildren) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const sdk = createAuthorizationFixtureClient({subject:'role-test',tenantId:'42',permissionCodes:['system:role:read', 'system:role:create', 'system:role:update', 'system:role-permission:read'],authVersion:1,policyVersion:1}, {}) as unknown as Rbac3Client
  const api: FeatureApiClient = {
    request: async <T,>(path: string, request?: FeatureApiRequest) => {
      if (detailRequest && path === '/api/tianquan-jianshen/v1/iam/roles/2') return await detailRequest(request) as T
      return (path.endsWith('/resources')
      ? {
          roleId: '2', applicationId: '71', roleVersion: 4,
          directResourceIds: ['501'], derivedApiResourceIds: ['701'],
          summary: { menuPageCount: 1, actionCount: 1, apiCount: 1, inheritedCount: 0 },
          nodes: [
            { resourceId: '500', resourceCode: 'iam', name: '权限平台', category: 'MENU_PAGE', technicalType: 'MENU', parentCode: null, status: 'ACTIVE', mappingStatus: 'CONFIGURED', grantState: 'NONE', grantable: false, disabledReason: 'RESOURCE_NOT_GRANTABLE', linkedApis: [], children: [
              { resourceId: '501', resourceCode: 'iam.users', name: '用户管理', category: 'MENU_PAGE', technicalType: 'ROUTE', parentCode: 'iam', status: 'ACTIVE', mappingStatus: 'CONFIGURED', grantState: 'DIRECT', grantable: true, disabledReason: null, linkedApis: [{ resourceId: '701', resourceCode: 'iam.api.users.list', name: '用户列表', method: 'GET', path: '/users' }], children: [] },
              { resourceId: '502', resourceCode: 'iam.users.disable', name: '禁用用户', category: 'ACTION', technicalType: 'ACTION', parentCode: 'iam.users', status: 'ACTIVE', mappingStatus: 'PENDING_VALIDATION', grantState: 'NONE', grantable: false, disabledReason: 'PERMISSION_MAPPING_REQUIRED', linkedApis: [], children: [] },
            ] },
          ],
        }
      : path.includes('impact-analysis')
        ? path.includes('/1/')
          ? {roleId: '1', activationRoots: ['1'], roleFamily: ['1', '2'], effectiveFamilyRisk: 'HIGH', permissionCount: 4, conflicts: []}
          : { roleId: '2', activationRoots: ['1', '3'], roleFamily: ['2'], effectiveFamilyRisk: 'HIGH', permissionCount: 4, conflicts: ['AMBIGUOUS_ROOT'] }
        : [
          { roleId: '1', applicationId: '71', roleCode: 'ROOT', roleName: '根角色', roleType: 'MANAGEMENT', riskLevel: 'LOW', privileged: false, status: 'ACTIVE', version: 1 },
          { roleId: '2', applicationId: '71', roleCode: 'CHILD', roleName: '子角色', roleType: 'POSITION', riskLevel: 'HIGH', privileged: false, status: 'DISABLED', version: 2 },
        ]) as T
    },
  }
  return (
    <QueryClientProvider client={queryClient}>
        <TestAuthorizationProvider client={sdk}>
        <FeatureApiProvider client={api}>
          <MemoryRouter initialEntries={['/iam/roles']}>{children}</MemoryRouter>
        </FeatureApiProvider>
      </TestAuthorizationProvider>
    </QueryClientProvider>
  )
}

const wrapper = createWrapper()

const originalRoleDetail = {
  roleId: '2', applicationId: '71', roleName: '子角色原值', status: 'DISABLED', landingRouteId: '502',
  landingPriority: 8, maximumAssignmentDays: 60, version: 23,
}

describe('role pages', () => {
  it('loads the exact edit detail before sending an update that preserves the original configuration', async () => {
    const detailRequest = vi.fn().mockResolvedValue(originalRoleDetail)
    render(<RoleGraphPage applicationId="71" />, {wrapper: createWrapper(detailRequest)})
    fireEvent.click((await screen.findAllByRole('button', {name: /^编\s*辑$/}))[1])

    await waitFor(() => expect(detailRequest).toHaveBeenCalledWith(expect.objectContaining({signal: expect.any(AbortSignal)})))
    await waitFor(() => expect(screen.getByLabelText('角色名称')).toHaveValue('子角色原值'))
    fireEvent.change(screen.getByLabelText('角色名称'), {target: {value: '仓储子角色'}})
    fireEvent.click(screen.getByRole('button', {name: /^保\s*存$/}))
    await waitFor(() => expect(detailRequest).toHaveBeenCalledWith(expect.objectContaining({method: 'PUT', body: {
      roleName: '仓储子角色', status: 'DISABLED', landingRouteId: '502', landingPriority: 8,
      maximumAssignmentDays: 60, expectedRoleVersion: 23,
    }})))
  })

  it.each([
    {...originalRoleDetail, landingRouteId: undefined},
    {...originalRoleDetail, version: Number.MAX_SAFE_INTEGER + 1},
    {...originalRoleDetail, applicationId: '93'},
  ])('blocks a save when edit detail is incomplete, imprecise, or outside the selection', async (detail) => {
    const detailRequest = vi.fn().mockResolvedValue(detail)
    render(<RoleGraphPage applicationId="71" />, {wrapper: createWrapper(detailRequest)})
    fireEvent.click((await screen.findAllByRole('button', {name: /^编\s*辑$/}))[1])
    expect(await screen.findByText('角色详情不可用于编辑')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: /^保\s*存$/})).toBeDisabled()
    expect(detailRequest).toHaveBeenCalledTimes(1)
  })

  it('keeps a role uneditable when the backend does not expose the detail route', async () => {
    const request = vi.fn().mockRejectedValue(new ApiError('未找到角色详情', 404, 'RESOURCE_NOT_FOUND'))
    render(<RoleGraphPage applicationId="71" />, {wrapper: createWrapper(request)})
    fireEvent.click((await screen.findAllByRole('button', {name: /^编\s*辑$/}))[1])
    expect(await screen.findByText('角色详情不可用于编辑')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: /^保\s*存$/})).toBeDisabled()
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('preserves explicit nulls when an unchanged optional field is submitted', async () => {
    const request = vi.fn().mockResolvedValue({...originalRoleDetail, landingRouteId: null, maximumAssignmentDays: null})
    render(<RoleGraphPage applicationId="71" />, {wrapper: createWrapper(request)})
    fireEvent.click((await screen.findAllByRole('button', {name: /^编\s*辑$/}))[1])
    const save = await screen.findByRole('button', {name: /^保\s*存$/})
    await waitFor(() => expect(save).toBeEnabled())
    fireEvent.click(save)
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'PUT', body: expect.objectContaining({landingRouteId: null, maximumAssignmentDays: null}),
    })))
  })

  it('rereads after a conflict and reapplies only reviewed changes to the new version', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(originalRoleDetail)
      .mockRejectedValueOnce(new ApiError('角色版本已变化', 409, 'RESOURCE_VERSION_CONFLICT'))
      .mockResolvedValueOnce({...originalRoleDetail, landingPriority: 18, version: 24})
      .mockResolvedValueOnce({})
    render(<RoleGraphPage applicationId="71" />, {wrapper: createWrapper(request)})
    fireEvent.click((await screen.findAllByRole('button', {name: /^编\s*辑$/}))[1])
    await waitFor(() => expect(screen.getByLabelText('角色名称')).toHaveValue('子角色原值'))
    fireEvent.change(screen.getByLabelText('角色名称'), {target: {value: '我的角色名'}})
    const save = screen.getByRole('button', {name: /^保\s*存$/})
    fireEvent.click(save)
    expect(await screen.findByText('提交结果需要复核')).toBeInTheDocument()
    const accept = screen.getByRole('button', {name: '确认后继续编辑'})
    await waitFor(() => expect(accept).toBeEnabled())
    expect(save).toBeDisabled()
    expect(request).toHaveBeenCalledTimes(3)
    fireEvent.click(accept)
    fireEvent.click(save)
    await waitFor(() => expect(request).toHaveBeenNthCalledWith(4, expect.objectContaining({
      method: 'PUT', body: expect.objectContaining({roleName: '我的角色名', landingPriority: 18, expectedRoleVersion: 24}),
    })))
  })

  it('aborts a pending detail read when the edit dialog is canceled', async () => {
    const request = vi.fn<(options?: FeatureApiRequest) => Promise<never>>(() => new Promise(() => undefined))
    render(<RoleGraphPage applicationId="71" />, {wrapper: createWrapper(request)})
    fireEvent.click((await screen.findAllByRole('button', {name: /^编\s*辑$/}))[1])
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const [options] = request.mock.calls[0]
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Close'}))
    await waitFor(() => expect(options?.signal?.aborted).toBe(true))
  })

  it('uses the IAM controller paths for role list and impact analysis', async () => {
    const request = vi.fn().mockResolvedValue([])
    const api = roleApi({request})

    await api.roles('71')
    await api.impact('2')
    await api.create({
      applicationId: '71', roleCode: 'AUDITOR', roleName: '审计员', roleType: 'POSITION',
      riskLevel: 'LOW', privileged: false, landingRouteId: null, landingPriority: 0,
      maximumAssignmentDays: null,
    })
    await api.update('2', {
      roleName: '子角色', status: 'ACTIVE', landingRouteId: null, landingPriority: 0,
      maximumAssignmentDays: null, expectedRoleVersion: 2,
    })
    await api.addInheritance('1', { applicationId: '71', juniorRoleId: '2', expectedRoleVersion: 1 })
    await api.removeInheritance('1', '2', { applicationId: '71', expectedRoleVersion: 2 })

    expect(request).toHaveBeenNthCalledWith(1, '/api/tianquan-jianshen/v1/iam/roles', {query: {applicationId: '71'}})
    expect(request).toHaveBeenNthCalledWith(2, '/api/tianquan-jianshen/v1/iam/roles/2/impact-analysis')
    expect(request).toHaveBeenNthCalledWith(3, '/api/tianquan-jianshen/v1/iam/roles', expect.objectContaining({method: 'POST'}))
    expect(request).toHaveBeenNthCalledWith(4, '/api/tianquan-jianshen/v1/iam/roles/2', expect.objectContaining({method: 'PUT'}))
    expect(request).toHaveBeenNthCalledWith(5, '/api/tianquan-jianshen/v1/iam/roles/1/inheritances', expect.objectContaining({method: 'POST'}))
    expect(request).toHaveBeenNthCalledWith(6, '/api/tianquan-jianshen/v1/iam/roles/1/inheritances/2', {
      method: 'DELETE', query: {applicationId: '71', expectedRoleVersion: 2},
    })
  })

  it('loads the selected relationship while keeping role status in the list', async () => {
    render(<RoleGraphPage applicationId="71" />, {wrapper})
    expect(await screen.findByText('停用')).toBeInTheDocument()
    expect(screen.queryByText('AMBIGUOUS_ROOT')).not.toBeInTheDocument()
    const actions = screen.getAllByRole('button', {name: '角色关系'})
    fireEvent.click(actions[0])
    expect(await screen.findByText('Root')).toBeInTheDocument()
    fireEvent.click(actions[1])
    expect(await screen.findByText('Child')).toBeInTheDocument()
    expect(screen.getByText('AMBIGUOUS_ROOT')).toBeInTheDocument()
  })

  it('offers the five backend role types instead of treating hierarchy as a type', async () => {
    render(<RoleGraphPage applicationId="71" />, {wrapper})
    fireEvent.click(await screen.findByRole('button', {name: '新建角色'}))
    fireEvent.mouseDown(screen.getByLabelText('角色类型'))
    for (const label of ['公共角色', '岗位角色', '管理角色', '临时角色', '应急角色']) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0)
    }
    expect(screen.queryByText('激活根角色')).not.toBeInTheDocument()
    expect(screen.queryByText('业务角色')).not.toBeInTheDocument()
  })

  it('exposes permission grants from every role row', async () => {
    render(<RoleGraphPage applicationId="71" />, {wrapper})

    await waitFor(() => expect(screen.getByText('根角色')).toBeInTheDocument())
    expect(screen.getAllByRole('link', {name: '权限字符授权'}).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', {name: '权限字符授权'})[0]).toHaveAttribute('href', '/iam/roles/1/permissions')
  })
})
