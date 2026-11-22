vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {TestAuthorizationProvider, createAuthorizationFixtureClient} from '../../test/authorization'
import {type Rbac3Client, Rbac3RequestError} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import type {PropsWithChildren} from 'react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {type FeatureApiClient, FeatureApiProvider} from '../shared/FeatureApi'
import {AuthenticationShell} from '../auth/AuthenticationShell'
import {gatewayAuth} from '../auth/gatewayAuth'
import {RoleActivationPage} from './RoleActivationPage'

const STEP_UP_INTENT_KEY = 'egon.tianquan-jianshen.role-activation.step-up'

describe('role activation page', () => {
  afterEach(() => {
    window.sessionStorage.clear()
    vi.restoreAllMocks()
  })

    it('submits a complete role set with the current authorization version', async () => {
        const replaceActiveRoles = vi.fn<Rbac3Client['replaceActiveRoles']>(async () => ({
      activeRoles: [{ applicationCode: 'orders', rootRoleIds: ['11', '12'] }],
            changed: true,
            authVersion: 3,
            policyVersion: 3,
            activationRequired: false,
            snapshotChecksum: 'sum',
    }))
    render(<RoleActivationPage />, { wrapper: wrapper(replaceActiveRoles) })

    await waitFor(() => expect(screen.getByText('订单管理员')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('checkbox', { name: /订单复核员/ }))
    fireEvent.click(screen.getByRole('button', { name: '激活所选角色' }))

    await waitFor(() => expect(replaceActiveRoles).toHaveBeenCalledWith({
        roleIds: ['11', '12'], expectedAuthVersion: 2,
    }, expect.any(AbortSignal)))
  })

  it('reads the current root set after an uncertain replacement without replaying the write', async () => {
    const replaceActiveRoles = vi.fn<Rbac3Client['replaceActiveRoles']>().mockRejectedValue(
      new Rbac3RequestError({status: 503, code: 'AUTH_RUNTIME_UNAVAILABLE', message: 'unavailable', retryable: true}),
    )
    const readVersion = vi.fn().mockReturnValueOnce(2).mockReturnValue(3)
    render(<RoleActivationPage />, {wrapper: wrapper(replaceActiveRoles, readVersion)})
    await screen.findByText('订单管理员')
    fireEvent.click(screen.getByRole('checkbox', {name: /订单复核员/}))
    fireEvent.click(screen.getByRole('button', {name: '激活所选角色'}))
    await screen.findByRole('button', {name: '确认已核对当前集合'})
    await screen.findByText('orders: 12')
    expect(screen.getByRole('button', {name: /激活所选角色/})).toBeDisabled()
    expect(readVersion).toHaveBeenCalledTimes(2)
    expect(replaceActiveRoles).toHaveBeenCalledTimes(1)
  })

  it('shows server-side DSD refusal without retrying the mutation', async () => {
    const replaceActiveRoles = vi.fn<Rbac3Client['replaceActiveRoles']>().mockRejectedValue(
      new Rbac3RequestError({status: 409, code: 'APP_ROLE_ACTIVATION_MUTEX_VIOLATION', message: 'DSD', retryable: false}),
    )
    render(<RoleActivationPage />, {wrapper: wrapper(replaceActiveRoles)})
    await screen.findByText('订单管理员')
    fireEvent.click(screen.getByRole('button', {name: '激活所选角色'}))
    expect(await screen.findByText(/APP_ROLE_ACTIVATION_MUTEX_VIOLATION/)).toBeInTheDocument()
    expect(replaceActiveRoles).toHaveBeenCalledTimes(1)
  })

  it('requests reauthentication without storing or replaying a role mutation', async () => {
    const stepUpRequired = new Rbac3RequestError({
      status: 401,
      code: 'STEP_UP_REQUIRED',
      message: 'strong authentication required',
      retryable: false,
    })
    const replaceActiveRoles = vi.fn<Rbac3Client['replaceActiveRoles']>()
      .mockRejectedValueOnce(stepUpRequired)
      .mockResolvedValueOnce({
        activeRoles: [{applicationCode: 'orders', rootRoleIds: ['11']}],
        changed: true,
        authVersion: 3,
        policyVersion: 3,
        activationRequired: false,
        snapshotChecksum: 'sum',
      })
    const stepUp = vi.spyOn(gatewayAuth, 'login').mockResolvedValue(false)
    const first = render(<RoleActivationPage />, {wrapper: wrapper(replaceActiveRoles)})

    await waitFor(() => expect(screen.getByText('订单管理员')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', {name: '激活所选角色'}))
    await waitFor(() => expect(screen.getByText('关键角色需要强认证')).toBeInTheDocument())

    expect(screen.queryByLabelText('Current Password')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '重新认证'}))

    await waitFor(() => expect(stepUp).toHaveBeenCalledWith('/', {reauthenticate: true}))
    expect(window.sessionStorage.getItem(STEP_UP_INTENT_KEY)).toBeNull()
    first.unmount()

    render(<RoleActivationPage />, {wrapper: wrapper(replaceActiveRoles)})

    await screen.findByText('订单管理员')
    expect(replaceActiveRoles).toHaveBeenCalledTimes(1)
    expect(window.sessionStorage.getItem(STEP_UP_INTENT_KEY)).toBeNull()
  })
})

const wrapper = (replaceActiveRoles: Rbac3Client['replaceActiveRoles'], readVersion = () => 2) => ({children}: PropsWithChildren) => {
  const candidates = {
      applications: [{
          applicationId: '71', applicationCode: 'orders', candidates: [
              {
                  rootRoleId: '11',
                  rootRoleCode: 'ORDER_ADMIN',
                  displayName: '订单管理员',
                  sourceRoleIds: ['91'],
                  eligibleAssignmentIds: ['201'],
                  mutexSetIds: [],
                  effectiveFamilyRisk: 'HIGH',
                  requiredAuthStrength: 'MFA',
                  landingRouteCode: 'orders'
              },
              {
                  rootRoleId: '12',
                  rootRoleCode: 'ORDER_REVIEWER',
                  displayName: '订单复核员',
                  sourceRoleIds: ['92'],
                  eligibleAssignmentIds: ['202'],
                  mutexSetIds: [],
                  effectiveFamilyRisk: 'LOW',
                  requiredAuthStrength: 'PASSWORD',
                  landingRouteCode: 'orders'
              },
          ]
      }],
      basedOnAuthVersion: 2,
      basedOnPolicyVersion: 3,
      basedOnDirectorySnapshotVersion: '8',
      configurationErrors: [],
    calculatedAt: '2026-08-01T00:00:00Z',
  }
  const activeRoles = {
      activeRoles: [{applicationCode: 'orders', rootRoleIds: ['11']}],
      activationRequired: true,
      authVersion: 2,
      policyVersion: 3,
    snapshotChecksum: 'old',
  }
  const sdk = createAuthorizationFixtureClient({subject:'mario',tenantId:'9',permissionCodes:['system:role-activation:use'],authVersion:2,policyVersion:3}, {getActivationCandidates: async () => candidates,getActiveRoles: async () => activeRoles,replaceActiveRoles}) as unknown as Rbac3Client
  const currentRoleSet = () => {
    const authVersion = readVersion()
    return authVersion === 2 ? activeRoles : {...activeRoles, authVersion, activeRoles: [{applicationCode: 'orders', rootRoleIds: ['12']}]}
  }
  const api: FeatureApiClient = {
    request: async <T,>(path: string) => (
      path.endsWith('/role-activation-candidates') ? candidates : currentRoleSet()
    ) as T,
  }
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <TestAuthorizationProvider client={sdk}>
        <FeatureApiProvider client={api}><AuthenticationShell>{children}</AuthenticationShell></FeatureApiProvider>
      </TestAuthorizationProvider>
    </QueryClientProvider>
  )
}
