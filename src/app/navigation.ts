import {FrontendResourceRegistry, type FrontendNavigationNode} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import type {PermissionSnapshot, PermissionSnapshotBinding} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import type {EnterpriseNavigationItem} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {resources, resourceReferences} from '../permissions/resources'
import {authorizationRouteDescriptors} from '../features/authorization.routes'
import {governanceRouteDescriptors} from '../features/governance.routes'
import {runtimeRouteDescriptors} from '../features/runtime.routes'
import type {FeatureRouteDescriptor} from '../features/shared/RouteDescriptor'

export interface WorkbenchRouteMeta {
  readonly groupKey?: string
  readonly identityParams?: readonly string[]
  readonly queryKeys?: readonly string[]
}

const WORKBENCH_ROUTE_META: Readonly<Record<string, WorkbenchRouteMeta>> = {
  'overview': { groupKey: 'tianquan-jianshen.menu.iam' },
  'directory-users': { groupKey: 'tianquan-jianshen.menu.iam.directory' },
  'directory-organizations': { groupKey: 'tianquan-jianshen.menu.iam.directory' },
  'directory-positions': { groupKey: 'tianquan-jianshen.menu.iam.directory' },
  'tenant-applications': { groupKey: 'tianquan-jianshen.menu.iam.catalog' },
  'resources': { groupKey: 'tianquan-jianshen.menu.iam.catalog' },
  'fields': { groupKey: 'tianquan-jianshen.menu.iam.catalog' },
  'permissions': { groupKey: 'tianquan-jianshen.menu.iam.catalog' },
  'business-catalog': { groupKey: 'tianquan-jianshen.menu.iam.catalog' },
  'manifest-versions': { groupKey: 'tianquan-jianshen.menu.iam.catalog' },
  'manifest-diff': { groupKey: 'tianquan-jianshen.menu.iam.catalog' },
  'roles': { groupKey: 'tianquan-jianshen.menu.iam.authorization' },
  'role-permissions': {
    groupKey: 'tianquan-jianshen.menu.iam.catalog',
    identityParams: ['roleId'],
  },
  'constraints': { groupKey: 'tianquan-jianshen.menu.iam.authorization' },
  'assignments': {
    groupKey: 'tianquan-jianshen.menu.iam.authorization',
    identityParams: ['userId'],
  },
  'management-policies': { groupKey: 'tianquan-jianshen.menu.iam.authorization' },
  'role-activation': { groupKey: 'tianquan-jianshen.menu.iam.authorization' },
  'simulation': { groupKey: 'tianquan-jianshen.menu.iam.diagnostics' },
  'audit': { groupKey: 'tianquan-jianshen.menu.iam.diagnostics' },
  'runtime': { groupKey: 'tianquan-jianshen.menu.iam.diagnostics' },
}

export const resolveWorkbenchRouteMeta = (route: FeatureRouteDescriptor): WorkbenchRouteMeta =>
  WORKBENCH_ROUTE_META[route.key] ?? {}

export const localResourceRegistry = new FrontendResourceRegistry(resources, resourceReferences)
export const applicationRouteDescriptors: readonly FeatureRouteDescriptor[] = [...governanceRouteDescriptors,
  ...authorizationRouteDescriptors, ...runtimeRouteDescriptors].sort((left, right) => left.navigationOrder - right.navigationOrder || left.key.localeCompare(right.key))
export const isRouteAllowed = (snapshot: PermissionSnapshot | null, binding: PermissionSnapshotBinding | null, route: FeatureRouteDescriptor) =>
  localResourceRegistry.canAccessRoute(route.resourceKey, snapshot, binding)
export const visibleNavigation = (snapshot: PermissionSnapshot | null, binding: PermissionSnapshotBinding | null) =>
  localResourceRegistry.navigation(snapshot, binding).map(toNavigationItem).filter((item): item is EnterpriseNavigationItem => item !== null)
export const resolveApplicationLanding = (snapshot: PermissionSnapshot | null, binding: PermissionSnapshotBinding | null): string | null =>
  applicationRouteDescriptors.find(route => !route.hideFromNav && isRouteAllowed(snapshot, binding, route))?.path ?? null
const toNavigationItem = (node: FrontendNavigationNode): EnterpriseNavigationItem | null => {
  if (node.target.hidden === 'true') return null
  const children = node.children.map(toNavigationItem).filter((value): value is EnterpriseNavigationItem => value !== null)
  if (node.type === 'MENU' && children.length === 0 && !node.target.route) return null
  return {key: node.key, label: typeof node.target.label === 'string' ? node.target.label : node.key,
    path: typeof node.target.route === 'string' ? node.target.route : undefined, children: children.length ? children : undefined}
}
