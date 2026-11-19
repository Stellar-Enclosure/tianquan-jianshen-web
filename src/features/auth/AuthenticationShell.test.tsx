vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {permissionSnapshotFixture, TestAuthorizationProvider} from '../../test/authorization'
import {type Rbac3Client, Rbac3RequestError} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {AuthenticationShell} from './AuthenticationShell'
import {gatewayAuth} from './gatewayAuth'
import {CurrentAuthorizationProvider} from './CurrentAuthorizationProvider'
import {createAdminApiClients} from '../../api/adminApiClient'
import {AuthRequestContext} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import type {PermissionSnapshot} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'

describe('authentication shell', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('offers unified SSO without local username, password, or token fields', async () => {
    const client = {
        getAbout: async () => {
        throw new Rbac3RequestError({
          status: 401,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'login',
          retryable: false,
        })
      },
    } as unknown as Rbac3Client
    render(
      <MemoryRouter>
          <TestAuthorizationProvider client={client}>
          <AuthenticationShell><div>READY CONTENT</div></AuthenticationShell>
        </TestAuthorizationProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: '使用统一身份登录' }))
      .toBeInTheDocument()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('用户名')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('密码')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Token/)).not.toBeInTheDocument()
  })

  it('starts the configured OIDC flow from the sign-in action', async () => {
    const client = {
      getAbout: async () => {
        throw new Rbac3RequestError({
          status: 401,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'login',
          retryable: false,
        })
      },
    } as unknown as Rbac3Client
    const login = vi.spyOn(gatewayAuth, 'login').mockResolvedValue(false)
    render(
      <MemoryRouter>
        <TestAuthorizationProvider client={client}>
          <AuthenticationShell><div>READY CONTENT</div></AuthenticationShell>
        </TestAuthorizationProvider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', {name: '使用统一身份登录'}))

    expect(login).toHaveBeenCalledWith('/', {signal: expect.any(AbortSignal)})
  })

  it('calls both APIs at the fixed Resource origin with the same Bearer and no cookie', async () => {
    const snapshot = permissionSnapshotFixture()
    const feature = {health: 'ready'}
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({success: true, data: snapshot}))
      .mockResolvedValueOnce(Response.json({success: true, data: feature}))
    const {clients} = createFixtureClients(fetcher)
    await expect(clients.rbac3Client.getPermissionSnapshot()).resolves.toEqual(snapshot)
    await expect(clients.featureClient.request('/api/v1/example')).resolves.toEqual(feature)
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      'https://jianshen.example.invalid/api/v1/authorization/effective-permissions',
      'https://jianshen.example.invalid/api/v1/example',
    ])
    for (const [, options] of fetcher.mock.calls) {
      expect(options?.credentials).toBe('omit')
      expect(options?.redirect).toBe('error')
      expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer fixture-access')
    }
  })

  it('discards an old bootstrap and clears the query cache when the authorization epoch changes', async () => {
    vi.stubEnv('VITE_PERMISSION_NAMESPACE', 'default')
    vi.stubEnv('VITE_PERMISSION_ENVIRONMENT', 'test')
    let release!: (value: PermissionSnapshot) => void
    const pending = new Promise<PermissionSnapshot>(resolve => {release = resolve})
    const {clients, context} = createFixtureClients(vi.fn())
    const load = vi.spyOn(clients.rbac3Client, 'getPermissionSnapshot').mockReturnValue(pending)
    const queryClient = new QueryClient()
    queryClient.setQueryData(['previous-users'], ['fixture-user'])
    render(<MemoryRouter><QueryClientProvider client={queryClient}>
      <CurrentAuthorizationProvider clients={clients}><div>READY CONTENT</div></CurrentAuthorizationProvider>
    </QueryClientProvider></MemoryRouter>)
    await waitFor(() => expect(load).toHaveBeenCalledOnce())

    await act(async () => {
      context.invalidate()
      release(permissionSnapshotFixture())
      await pending
    })
    expect(load.mock.lastCall?.[0]?.aborted).toBe(true)
    expect(queryClient.getQueryData(['previous-users'])).toBeUndefined()
    expect(screen.queryByText('READY CONTENT')).not.toBeInTheDocument()
    expect(screen.getByRole('button', {name: '使用统一身份登录'})).toBeInTheDocument()
  })

  it.each(['issuer', 'tenant', 'deployment'] as const)('rejects a snapshot for another %s', async mismatch => {
    vi.stubEnv('VITE_PERMISSION_NAMESPACE', 'default')
    vi.stubEnv('VITE_PERMISSION_ENVIRONMENT', 'test')
    const {clients} = createFixtureClients(vi.fn())
    const snapshot = permissionSnapshotFixture()
    vi.spyOn(clients.rbac3Client, 'getPermissionSnapshot').mockResolvedValue({
      ...snapshot,
      issuer: mismatch === 'issuer' ? 'https://other.example.invalid' : snapshot.issuer,
      catalogScope: {...snapshot.catalogScope,
        tenantId: mismatch === 'tenant' ? '99' : '42',
        environment: mismatch === 'deployment' ? 'other' : 'test'},
    })
    render(<MemoryRouter><QueryClientProvider client={new QueryClient()}>
      <CurrentAuthorizationProvider clients={clients}><div>READY CONTENT</div></CurrentAuthorizationProvider>
    </QueryClientProvider></MemoryRouter>)
    expect(await screen.findByText('权限快照与当前身份或部署范围不一致')).toBeInTheDocument()
    expect(screen.queryByText('READY CONTENT')).not.toBeInTheDocument()
  })
})

function createFixtureClients(fetcher: typeof fetch) {
  const context = new AuthRequestContext()
  const identity = {
    issuer: 'https://identity.example/tenants/42', subject: 'fixture-user', tenantId: '42', clientId: 'jianshen-42',
    accessExpiresAt: Date.now() + 60_000, resource: 'https://jianshen.example.invalid/resource',
  }
  const clients = createAdminApiClients({
    identity: async () => identity,
    context,
    authority: () => ({
      context, apiBaseUrl: 'https://jianshen.example.invalid', resource: identity.resource,
      authorizationHeader: () => 'Bearer fixture-access', invalidate: () => context.invalidate(),
    }),
  }, fetcher)
  return {clients, context}
}
