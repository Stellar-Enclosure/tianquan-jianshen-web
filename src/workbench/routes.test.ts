import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../permissions/FieldCatalog', () => ({
  useWritableFields: () => true,
  useWritableFieldKeys: () => true,
}))
import {
  validatePageDescriptor,
  validateRelativeRoutePath,
  type WorkbenchHost,
  type WorkbenchPort,
} from '@stellar-enclosure/stellar-enclosure-web-shared'
import { snapshotContext } from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import { ApplicationRouter } from '../app/router'
import { FeatureApiProvider, type FeatureApiClient } from '../features/shared/FeatureApi'
import { TestAuthorizationProvider, createAuthorizationFixtureClient, permissionSnapshotFixture } from '../test/authorization'
import {
  buildJianshenCatalogPages,
  canAccessJianshenRoute,
  jianshenWorkbenchRoutes,
  matchJianshenRoute,
} from './routes'

const SPEC_JIANSHEN_PATTERNS = [
  '/iam/overview',
  '/iam/users',
  '/iam/organizations',
  '/iam/positions',
  '/iam/tenant-applications',
  '/iam/resources',
  '/iam/fields',
  '/iam/permissions',
  '/iam/businesses',
  '/iam/manifests',
  '/iam/manifest-diff',
  '/iam/roles',
  '/iam/roles/:roleId/permissions',
  '/iam/policies',
  '/iam/users/:userId/role-assignments',
  '/iam/management-policies',
  '/iam/role-activation',
  '/iam/diagnostics/simulation',
  '/iam/diagnostics/audit',
  '/iam/diagnostics/runtime',
] as const

const FULL_PERMISSIONS = [
  'system:runtime:read',
  'system:user:read',
  'system:organization:read',
  'system:position:read',
  'system:application:read',
  'system:permission-catalog:read',
  'system:business:read',
  'system:role:read',
  'system:role-permission:read',
  'system:authorization-constraint:read',
  'system:data-rule:read',
  'system:operation-sod:read',
  'system:role-assignment:read',
  'system:management-policy:read',
  'system:role-activation:read',
  'system:authorization-simulation:execute',
  'system:audit:read',
  'system:authorization-runtime:read',
] as const

describe('jianshenWorkbenchRoutes', () => {
  it('registers all 20 Spec §12.1 IAM routes with valid relative paths and excludes auth callbacks', () => {
    const patterns = jianshenWorkbenchRoutes.map((route) => route.pattern)
    expect(new Set(patterns)).toEqual(new Set(SPEC_JIANSHEN_PATTERNS))
    expect(jianshenWorkbenchRoutes).toHaveLength(20)

    const pageIds = new Set<string>()
    for (const route of jianshenWorkbenchRoutes) {
      expect(pageIds.has(route.pageId)).toBe(false)
      pageIds.add(route.pageId)
      expect(validateRelativeRoutePath(route.pattern)).toBe(route.pattern)
      expect(route.pattern).not.toMatch(/\/auth\//)
    }

    const fullSnapshot = permissionSnapshotFixture({ permissionCodes: [...FULL_PERMISSIONS] })
    const fullBinding = snapshotContext(fullSnapshot, 1)
    const descriptors = buildJianshenCatalogPages(fullSnapshot, fullBinding)
    expect(descriptors.length).toBeGreaterThan(0)
    for (const descriptor of descriptors) {
      expect(validatePageDescriptor(descriptor)).toBe(true)
    }
    expect(descriptors.some((item) => item.pattern === '/iam/roles/:roleId/permissions')).toBe(false)
    expect(descriptors.some((item) => item.pattern === '/iam/users/:userId/role-assignments')).toBe(false)
  })

  it('matches static and parameterized routes cleanly and preserves identity params', () => {
    const rolePerm = matchJianshenRoute('/iam/roles/9007199254740993/permissions')
    expect(rolePerm?.route.pattern).toBe('/iam/roles/:roleId/permissions')
    expect(rolePerm?.params).toEqual({ roleId: '9007199254740993' })
    expect(rolePerm?.route.identityParams).toEqual(['roleId'])

    const assignment = matchJianshenRoute('/iam/users/user-9/role-assignments')
    expect(assignment?.route.pattern).toBe('/iam/users/:userId/role-assignments')
    expect(assignment?.params).toEqual({ userId: 'user-9' })
    expect(assignment?.route.identityParams).toEqual(['userId'])

    expect(matchJianshenRoute('/auth/oidc/callback/reg-1')).toBeNull()
    expect(matchJianshenRoute('/iam/tenants')).toBeNull()
  })

  it('separates instance tabs for two roles and two users and guards the hidden links', () => {
    const authorized = permissionSnapshotFixture({permissionCodes: [...FULL_PERMISSIONS]})
    const expired = {...authorized, snapshotExpiresAt: '2025-01-01T00:00:00Z'}
    const binding = snapshotContext(authorized, 1)
    const paths = [
      ['/iam/roles/9007199254740993/permissions', 'roleId', '9007199254740993'],
      ['/iam/roles/9007199254740994/permissions', 'roleId', '9007199254740994'],
      ['/iam/users/9107199254740993/role-assignments', 'userId', '9107199254740993'],
      ['/iam/users/9107199254740994/role-assignments', 'userId', '9107199254740994'],
    ] as const
    const identities = paths.map(([path, param, id]) => {
      const matched = matchJianshenRoute(path)!
      expect(matched.route.identityParams).toEqual([param])
      expect(matched.params).toEqual({[param]: id})
      expect(matched.route.hideFromNav).toBe(true)
      expect(canAccessJianshenRoute(authorized, binding, matched.route)).toBe(true)
      expect(canAccessJianshenRoute(expired, binding, matched.route)).toBe(false)
      return JSON.stringify([matched.route.pageId, matched.params[param]])
    })
    expect(new Set(identities).size).toBe(4)
  })

  it('filters catalog pages by real RBAC snapshot permissions without escalating access', () => {
    const limited = permissionSnapshotFixture({
      permissionCodes: ['system:runtime:read', 'system:audit:read', 'system:authorization-runtime:read'],
    })
    const limitedBinding = snapshotContext(limited, 1)
    const descriptors = buildJianshenCatalogPages(limited, limitedBinding)
    expect(descriptors.map((item) => item.pattern)).toEqual([
      '/iam/overview',
      '/iam/diagnostics/audit',
      '/iam/diagnostics/runtime',
    ])

    const empty = permissionSnapshotFixture({ permissionCodes: [] })
    const emptyBinding = snapshotContext(empty, 1)
    expect(buildJianshenCatalogPages(empty, emptyBinding)).toEqual([])
    const policyRoute = jianshenWorkbenchRoutes.find((route) => route.pattern === '/iam/policies')!
    expect(canAccessJianshenRoute(empty, emptyBinding, policyRoute)).toBe(false)
  })
})

describe('jianshen directory and resource workbench views', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders directory, application, business, and catalog views in WorkspaceList regions when embedded and blocks unauthorized access', async () => {
    const scope = {
      catalogScopeId: '101',
      tenantId: '42',
      businessCode: 'xingyuan',
      applicationCode: 'tianquan-jianshen',
      namespaceCode: 'default',
      environment: 'test',
    }
    const feature: FeatureApiClient = {
      request: async <T,>(requestPath: string) => {
        if (requestPath === '/api/tianquan-jianshen/v1/iam/roles') {
          return [
            {
              roleId: 'role-1',
              applicationId: '71',
              roleCode: 'ADMIN',
              roleName: '管理员',
              roleType: 'MANAGEMENT',
              riskLevel: 'HIGH',
              privileged: true,
              status: 'ACTIVE',
              version: 1,
            },
            {
              roleId: 'role-2',
              applicationId: '71',
              roleCode: 'AUDITOR',
              roleName: '审计员',
              roleType: 'PUBLIC',
              riskLevel: 'LOW',
              privileged: false,
              status: 'ACTIVE',
              version: 1,
            },
          ] as T
        }
        if (requestPath.includes('/roles/') && requestPath.endsWith('/impact')) {
          const roleId = requestPath.split('/').at(-2) ?? 'role-1'
          return {
            roleId,
            roleFamily: [roleId],
            activationRoots: [roleId],
            effectiveFamilyRisk: 'LOW',
            permissionCount: 1,
            conflicts: [],
          } as T
        }
        if (requestPath.includes('/roles/') && requestPath.endsWith('/permissions')) {
          return {
            roleId: 'role-1',
            target: scope,
            version: '1',
            catalogVersion: '1',
            permissions: [{ permissionCode: 'orders:read', validFrom: '2026-01-01T00:00:00Z', validTo: null }],
          } as T
        }
        if (requestPath.includes('/producers')) {
          return { target: scope, activeRevision: '1', producers: [] } as T
        }
        if (requestPath.includes('/versions')) {
          return { currentRevision: '1', versions: [] } as T
        }
        if (requestPath.includes('/assignments')) return [] as T
        if (requestPath.includes('/users/user-1')) {
          return { userId: 'user-1', identitySub: 'u1', status: 'ACTIVE', authVersion: 3 } as T
        }
        if (requestPath.includes('/management-policies')) return [] as T
        if (requestPath.includes('/management-capabilities')) {
          return { policyIds: [], operations: [], activationRootRoleIds: [] } as T
        }
        if (requestPath.includes('/activation-candidates')) {
          return { applications: [], dsdConstraints: [], configurationErrors: [] } as T
        }
        if (requestPath.includes('/active-roles')) {
          return { authVersion: 1, policyVersion: 1, activeRoles: [] } as T
        }
        if (requestPath.includes('/sod-sets') || requestPath.includes('/data-rules') || requestPath.includes('/operation-sod-rules')) {
          return [] as T
        }
        if (requestPath === '/api/tianquan-jianshen/v1/iam/runtime/mutations') {
          return { items: [] } as T
        }
        if (requestPath === '/api/tianquan-jianshen/v1/iam/runtime/yuheng-tianshu') {
          return { definition: { status: 'ACCEPTED', warnings: [] }, providerLease: { state: 'ACTIVE' }, gatewayRelease: { status: 'ROUTABLE' }, checkedAt: '2026-11-20T00:00:00Z' } as T
        }
        if (requestPath.includes('/audit-logs')) {
          return { items: [], nextCursor: null } as T
        }
        if (requestPath === '/api/tianquan-jianshen/v1/iam/runtime') {
          return {
            status: 'OK',
            tenantId: '42',
            policyVersion: 1,
            authVersion: 1,
            checkedAt: '2026-11-20T00:00:00Z',
          } as T
        }
        if (requestPath === '/api/tianquan-jianshen/v1/iam/users') {
          return {
            items: [{ userId: 'u-1', identitySub: 'alice', status: 'ACTIVE', authVersion: 1 }],
            page: 0,
            size: 20,
            total: 1,
          } as T
        }
        if (requestPath === '/api/tianquan-jianshen/v1/iam/organizations') {
          return [{
            orgUnitId: '1001',
            snapshotId: null,
            type: 'DEPARTMENT',
            code: 'hq',
            name: '总部',
            parentId: null,
            path: 'hq',
            depth: 0,
            status: 'ACTIVE',
            version: 1,
          }] as T
        }
        if (requestPath === '/api/tianquan-jianshen/v1/iam/positions') {
          return [{
            positionId: '2001',
            snapshotId: null,
            code: 'ops',
            name: '运营主管',
            orgUnitId: '1001',
            status: 'ACTIVE',
            validFrom: '2026-01-01T00:00:00Z',
            version: 1,
          }] as T
        }
        if (requestPath === '/api/tianquan-jianshen/v1/iam/tenant-applications') {
          return [{
            applicationId: 'app-1',
            ddcBusinessId: 'b-1',
            ddcApplicationId: 'a-1',
            businessCode: 'xingyuan',
            applicationCode: 'orders',
            applicationName: 'Orders',
            status: 'ACTIVE',
            displayPriority: 0,
            version: 1,
          }] as T
        }
        if (requestPath === '/api/tianquan-jianshen/v1/iam/businesses') {
          return [{
            ddcBusinessId: 'b-1',
            bizCode: 'xingyuan',
            bizName: '星元',
            enabled: true,
          }] as T
        }
        if (requestPath.endsWith('/permission-catalogs/scopes')) {
          return { scopes: [{ scope, applicationId: '71', producerCount: 1 }], nextAfterId: null } as T
        }
        if (requestPath.includes('/definitions')) {
          return {
            target: scope,
            kind: 'PERMISSION',
            definitions: [{
              id: 'def-1',
              key: 'orders:read',
              type: 'PERMISSION',
              meaning: 'Read orders',
              producerId: 'orders-java',
              state: 'ACTIVE',
              version: '1',
              activeProducerVersion: '1.0',
            }],
            nextAfterId: null,
          } as T
        }
        return {} as T
      },
    }

    const ports: WorkbenchPort[] = []
    const host: WorkbenchHost = {
      attach: (port) => {
        ports.push(port)
        return { ok: true }
      },
      reportCatalog: () => ({ ok: true }),
      requestNavigation: () => ({ ok: true }),
    }
    const sdk = createAuthorizationFixtureClient({
      subject: 'mario',
      tenantId: '42',
      permissionCodes: [...FULL_PERMISSIONS],
    })

    const { container } = render(
      createElement(
        QueryClientProvider,
        { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        createElement(
          TestAuthorizationProvider,
          { client: sdk },
          createElement(
            FeatureApiProvider,
            { client: feature },
            createElement(ApplicationRouter, { embedded: true, workbenchHost: host }),
          ),
        ),
      ),
    )

    await waitFor(() => expect(ports).toHaveLength(1))
    const port = ports[0]!

    await port.present({
      mode: 'show',
      navigationId: 1,
      tabKey: '["tianquan-jianshen","tianquan-jianshen.page.overview"]',
      target: { path: '/iam/overview', search: '' },
      signal: new AbortController().signal,
    })
    await waitFor(() => expect(screen.getByText('Auth Version')).toBeInTheDocument())

    await port.present({
      mode: 'show',
      navigationId: 2,
      tabKey: '["tianquan-jianshen","tianquan-jianshen.page.directory-organizations"]',
      target: { path: '/iam/organizations', search: '' },
      signal: new AbortController().signal,
    })
    await waitFor(() => expect(screen.getByText('总部')).toBeInTheDocument())

    const workspaceListPaths = [
      '/iam/users',
      '/iam/positions',
      '/iam/tenant-applications',
      '/iam/resources',
      '/iam/fields',
      '/iam/permissions',
      '/iam/businesses',
    ] as const
    for (let i = 0; i < workspaceListPaths.length; i += 1) {
      const path = workspaceListPaths[i]!
      await port.present({
        mode: 'show',
        navigationId: 10 + i,
        tabKey: `["tianquan-jianshen","${path}"]`,
        target: { path, search: '' },
        signal: new AbortController().signal,
      })
      await waitFor(() => expect(container.querySelector('[data-region="table"]')).toBeInTheDocument())
    }

    cleanup()
    const deniedPorts: WorkbenchPort[] = []
    const deniedHost: WorkbenchHost = {
      attach: (next) => {
        deniedPorts.push(next)
        return { ok: true }
      },
      reportCatalog: () => ({ ok: true }),
      requestNavigation: () => ({ ok: true }),
    }
    const deniedSdk = createAuthorizationFixtureClient({
      subject: 'mario',
      tenantId: '42',
      permissionCodes: ['system:runtime:read'],
    })
    render(
      createElement(
        QueryClientProvider,
        { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        createElement(
          TestAuthorizationProvider,
          { client: deniedSdk },
          createElement(
            FeatureApiProvider,
            { client: feature },
            createElement(ApplicationRouter, { embedded: true, workbenchHost: deniedHost }),
          ),
        ),
      ),
    )
    await waitFor(() => expect(deniedPorts).toHaveLength(1))
    await deniedPorts[0]!.present({
      mode: 'show',
      navigationId: 99,
      tabKey: '["tianquan-jianshen","tianquan-jianshen.page.directory-users"]',
      target: { path: '/iam/users', search: '' },
      signal: new AbortController().signal,
    })
    await waitFor(() => expect(screen.getByText('无权访问此页面')).toBeInTheDocument())
  })

  it('mounts Step 18 role, manifest, constraint, activation, simulation, runtime views and registers leave guards', async () => {
    const scope = {
      catalogScopeId: '101',
      tenantId: '42',
      businessCode: 'xingyuan',
      applicationCode: 'tianquan-jianshen',
      namespaceCode: 'default',
      environment: 'test',
    }
    const feature: FeatureApiClient = {
      request: async <T,>(requestPath: string, options?: Parameters<FeatureApiClient['request']>[1]) => {
        if (requestPath.endsWith('/permission-catalogs/scopes')) {
          return { scopes: [{ scope, applicationId: '71', producerCount: 1 }], nextAfterId: null } as T
        }
        if (requestPath === '/api/tianquan-jianshen/v1/iam/roles') {
          return [
            {
              roleId: 'role-1',
              applicationId: '71',
              roleCode: 'ADMIN',
              roleName: '管理员',
              roleType: 'MANAGEMENT',
              riskLevel: 'HIGH',
              privileged: true,
              status: 'ACTIVE',
              version: 1,
            },
            {
              roleId: 'role-2',
              applicationId: '71',
              roleCode: 'AUDITOR',
              roleName: '审计员',
              roleType: 'PUBLIC',
              riskLevel: 'LOW',
              privileged: false,
              status: 'ACTIVE',
              version: 1,
            },
          ] as T
        }
        if (requestPath.includes('/roles/') && requestPath.endsWith('/impact')) {
          const id = requestPath.split('/').at(-2) ?? 'role-1'
          return { roleId: id, roleFamily: [id], activationRoots: [id], effectiveFamilyRisk: 'LOW', permissionCount: 1, conflicts: [] } as T
        }
        if (requestPath.includes('/roles/') && requestPath.endsWith('/permissions')) {
          return { roleId: 'role-1', target: scope, version: '1', catalogVersion: '1', permissions: [{ permissionCode: 'orders:read', validFrom: '2026-01-01T00:00:00Z', validTo: null }] } as T
        }
        if (requestPath.includes('/definitions')) {
          return {
            target: scope,
            kind: options?.query?.kind,
            definitions: options?.query?.kind === 'RESOURCE' ? [] : [{
              id: 'def-1',
              key: 'orders:write',
              type: null,
              meaning: 'Write orders',
              producerId: 'orders-java',
              state: 'ACTIVE',
              version: '1',
              activeProducerVersion: '1',
            }],
            nextAfterId: null,
          } as T
        }
        if (requestPath.includes('/producers')) return {target: scope, activeRevision: '1',
          producers: [{producerId: 'orders-java', kind: 'JAVA', activeProducerVersion: '1'}]} as T
        if (requestPath.includes('/versions')) return { currentRevision: '1', versions: [] } as T
        if (requestPath.includes('/assignments')) return [] as T
        if (requestPath.includes('/users/user-1')) return { userId: 'user-1', identitySub: 'u1', status: 'ACTIVE', authVersion: 3 } as T
        if (requestPath.includes('/management-policies')) return [] as T
        if (requestPath.includes('/management-capabilities')) return { policyIds: [], operations: [], activationRootRoleIds: [] } as T
        if (requestPath.includes('/activation-candidates')) return { applications: [], dsdConstraints: [], configurationErrors: [] } as T
        if (requestPath.includes('/active-roles')) return { authVersion: 1, policyVersion: 1, activeRoles: [] } as T
        if (requestPath.includes('/sod-sets') || requestPath.includes('/data-rules') || requestPath.includes('/operation-sod-rules')) return [] as T
        return {} as T
      },
    }

    const ports: WorkbenchPort[] = []
    const host: WorkbenchHost = {
      attach: (next) => {
        ports.push(next)
        return { ok: true }
      },
      reportCatalog: () => ({ ok: true }),
      requestNavigation: () => ({ ok: true }),
    }
    const sdk = createAuthorizationFixtureClient({
      subject: 'mario',
      tenantId: '42',
      permissionCodes: [...FULL_PERMISSIONS, 'system:role-permission:manage', 'system:permission-catalog:activate'],
    })

    const { container } = render(
      createElement(
        QueryClientProvider,
        { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        createElement(
          TestAuthorizationProvider,
          { client: sdk },
          createElement(
            FeatureApiProvider,
            { client: feature },
            createElement(ApplicationRouter, { embedded: true, workbenchHost: host }),
          ),
        ),
      ),
    )

    await waitFor(() => expect(ports).toHaveLength(1))
    const port = ports[0]!

    await port.present({
      mode: 'show',
      navigationId: 201,
      tabKey: '["tianquan-jianshen","tianquan-jianshen.page.manifest-versions"]',
      target: { path: '/iam/manifests', search: '' },
      signal: new AbortController().signal,
    })
    await waitFor(() => expect(container.querySelector('[data-region="table"]')).toBeInTheDocument())

    const rolePermTab1 = '["tianquan-jianshen","tianquan-jianshen.page.role-permissions","role-1"]'
    await port.present({
      mode: 'show',
      navigationId: 202,
      tabKey: rolePermTab1,
      target: { path: '/iam/roles/role-1/permissions', search: '' },
      signal: new AbortController().signal,
    })
    fireEvent.click(await screen.findByRole('tab', {name: '权限字符'}))
    await waitFor(() => expect(screen.getByRole('checkbox', {name: /orders:write/})).toBeEnabled())
    expect(port.checkLeave({ reason: 'close', tabKey: rolePermTab1 })).toEqual(
      expect.objectContaining({ ok: true, dirty: false }),
    )
    fireEvent.click(screen.getByRole('checkbox', { name: /orders:write/ }))
    expect(port.checkLeave({ reason: 'close', tabKey: rolePermTab1 })).toEqual(
      expect.objectContaining({ ok: true, dirty: true }),
    )
  })
})
