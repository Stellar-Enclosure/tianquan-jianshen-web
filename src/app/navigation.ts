import {FrontendResourceRegistry, type FrontendNavigationNode} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import type {PermissionSnapshot, PermissionSnapshotBinding} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import type {EnterpriseNavigationItem} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {resources, resourceReferences} from '../permissions/resources'
import {authorizationRouteDescriptors} from '../features/authorization.routes'
import {governanceRouteDescriptors} from '../features/governance.routes'
import {runtimeRouteDescriptors} from '../features/runtime.routes'
import type {FeatureRouteDescriptor} from '../features/shared/RouteDescriptor'

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
