import { describe, expect, it } from 'vitest'
import {
  validatePageDescriptor,
  validateRelativeRoutePath,
} from '@stellar-enclosure/stellar-enclosure-web-shared'
import { snapshotContext } from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import { permissionSnapshotFixture } from '../test/authorization'
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
