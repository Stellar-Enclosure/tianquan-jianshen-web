import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {MemoryRouter, useLocation} from 'react-router-dom'
import {describe, expect, it, vi} from 'vitest'
import {EmbeddedWorkbench, type RouteRequest, type WorkbenchHost} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {snapshotContext} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {FeatureApiProvider, type FeatureApiClient} from '../features/shared/FeatureApi'
import {RoleGraphPage} from '../features/role/RoleGraphPage'
import {UserDirectoryPage} from '../features/directory/UserDirectoryPage'
import {TestAuthorizationProvider, createAuthorizationFixtureClient} from '../test/authorization'
import {buildJianshenCatalogPages} from './routes'

vi.mock('../permissions/FieldCatalog', () => ({useWritableFields: () => false, useWritableFieldKeys: () => false, usePlainReadFields: () => true}))
const roleIds = ['9007199254740993', '9007199254740994']
const userIds = ['9107199254740993', '9107199254740994']
const permissions = ['system:role:read', 'system:role-permission:read', 'system:permission-catalog:read', 'system:user:read', 'system:role-assignment:read']
const Location = () => <output data-testid="location">{useLocation().pathname}</output>

function renderList(kind: 'roles' | 'users', options: {embedded?: boolean; denied?: boolean; permissions?: readonly string[]; detailUserId?: string} = {}) {
  const requests: RouteRequest[] = []
  const host: WorkbenchHost = {
    attach: () => ({ok: true}), reportCatalog: () => ({ok: true}),
    requestNavigation: request => {requests.push(request); return options.denied ? {ok: false, code: 'DENIED'} : {ok: true}},
  }
  const sdk = createAuthorizationFixtureClient({permissionCodes: options.permissions ?? permissions})
  const feature: FeatureApiClient = {request: async <T,>(path: string) => {
    if (path.endsWith('/roles')) return roleIds.map((roleId, index) => ({roleId, applicationId: '71', roleCode: 'ROLE_'+index,
      roleName: 'Role '+index, roleType: 'MANAGEMENT', riskLevel: 'MEDIUM', privileged: false, status: 'ACTIVE', version: 0})) as T
    const users = userIds.map((userId, index) => ({userId, identitySub: 'user-'+index, status: 'ACTIVE', authVersion: 1}))
    if (path.endsWith('/users')) return {items: users, page: 0, size: 20, total: 2} as T
    if (path.endsWith('/users/'+userIds[0])) return users[0] as T
    return [] as T
  }}
  const page = kind === 'roles' ? <RoleGraphPage /> : <UserDirectoryPage initialUserId={options.detailUserId} />
  render(<QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>
    <TestAuthorizationProvider client={sdk}>
      <FeatureApiProvider client={feature}>
        <MemoryRouter initialEntries={['/iam/'+kind]}>
          <EmbeddedWorkbench host={options.embedded ? host : undefined} status="ready"
            pages={buildJianshenCatalogPages(sdk.fixtureSnapshot, snapshotContext(sdk.fixtureSnapshot, 0))}>
            <Location />{page}
          </EmbeddedWorkbench>
        </MemoryRouter>
      </FeatureApiProvider>
    </TestAuthorizationProvider>
  </QueryClientProvider>)
  return {requests}
}

describe('object links in the workbench', () => {
  it.each(['roles', 'users'] as const)('requests distinct host targets for two %s without changing the child router', async kind => {
    const {requests} = renderList(kind, {embedded: true})
    const links = await screen.findAllByRole('link', {name: kind === 'roles' ? '权限字符授权' : '角色任职'})
    expect(links).toHaveLength(2)
    for (const link of links) fireEvent.click(link)
    const ids = kind === 'roles' ? roleIds : userIds
    const suffix = kind === 'roles' ? 'permissions' : 'role-assignments'
    expect(requests).toEqual(ids.map((id, index) => ({requestId: index+1, mode: 'push', target: {path: '/iam/'+kind+'/'+id+'/'+suffix, search: ''}})))
    expect(screen.getByTestId('location')).toHaveTextContent('/iam/'+kind)
  })

  it('routes the user-detail assignment link through the same host protocol', async () => {
    const {requests} = renderList('users', {embedded: true, detailUserId: userIds[0]})
    fireEvent.click(await screen.findByRole('link', {name: '角色任职'}))
    expect(requests).toEqual([{requestId: 1, mode: 'push', target: {path: '/iam/users/'+userIds[0]+'/role-assignments', search: ''}}])
    expect(screen.getByTestId('location')).toHaveTextContent('/iam/users')
  })

  it.each(['roles', 'users'] as const)('keeps a real standalone link and local navigation for %s', async kind => {
    const {requests} = renderList(kind)
    const links = await screen.findAllByRole('link', {name: kind === 'roles' ? '权限字符授权' : '角色任职'})
    const path = '/iam/'+kind+'/'+(kind === 'roles' ? roleIds[0] : userIds[0])+'/'+(kind === 'roles' ? 'permissions' : 'role-assignments')
    expect(links[0]).toHaveAttribute('href', path)
    fireEvent.click(links[0])
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(path))
    expect(requests).toEqual([])
  })

  it('does not fall back to child navigation when the host denies an object request', async () => {
    const {requests} = renderList('roles', {embedded: true, denied: true})
    fireEvent.click((await screen.findAllByRole('link', {name: '权限字符授权'}))[0])
    expect(requests).toHaveLength(1)
    expect(screen.getByTestId('location')).toHaveTextContent('/iam/roles')
  })

  it.each(['roles', 'users'] as const)('does not expose unauthorized %s object links', async kind => {
    const {requests} = renderList(kind, {embedded: true, permissions: ['system:role:read', 'system:role-permission:read', 'system:user:read']})
    await screen.findByText(kind === 'roles' ? 'Role 0' : userIds[0])
    expect(screen.queryAllByRole('link', {name: kind === 'roles' ? '权限字符授权' : '角色任职'})).toHaveLength(0)
    expect(requests).toEqual([])
  })
})
