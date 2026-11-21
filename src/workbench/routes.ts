import {
  validateRelativeRoutePath,
  type AppPageDescriptor,
} from '@stellar-enclosure/stellar-enclosure-web-shared'
import type {
  PermissionSnapshot,
  PermissionSnapshotBinding,
} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import type { FeatureRouteDescriptor } from '../features/shared/RouteDescriptor'
import { resources } from '../permissions/resources'
import {
  applicationRouteDescriptors,
  isRouteAllowed,
  localResourceRegistry,
  type WorkbenchRouteMeta,
  resolveWorkbenchRouteMeta,
} from '../app/navigation'

export interface JianshenWorkbenchRoute {
  readonly key: string
  readonly pageId: string
  readonly pattern: string
  readonly resourceKey: string
  readonly label: string
  readonly groupKey?: string
  readonly groupLabel?: string
  readonly hideFromNav: boolean
  readonly identityParams: readonly string[]
  readonly queryKeys: readonly string[]
  readonly descriptor: FeatureRouteDescriptor
}

const GROUP_LABELS: Readonly<Record<string, string>> = {
  'tianquan-jianshen.menu.iam': 'IAM',
  'tianquan-jianshen.menu.iam.directory': '目录',
  'tianquan-jianshen.menu.iam.catalog': '资源目录',
  'tianquan-jianshen.menu.iam.authorization': '授权',
  'tianquan-jianshen.menu.iam.diagnostics': '诊断',
}

const pageResourceByKey = new Map(
  resources
    .filter((entry) => entry.type === 'PAGE')
    .map((entry) => [entry.key as string, entry]),
)

const resolveLabel = (descriptor: FeatureRouteDescriptor): string => {
  const resource = pageResourceByKey.get(descriptor.resourceKey)
  if (resource && 'target' in resource && typeof resource.target?.label === 'string') {
    return resource.target.label
  }
  return descriptor.title
}

const toWorkbenchRoute = (
  descriptor: FeatureRouteDescriptor,
): JianshenWorkbenchRoute => {
  const meta: WorkbenchRouteMeta = resolveWorkbenchRouteMeta(descriptor)
  const groupKey = meta.groupKey
  return {
    key: descriptor.key,
    pageId: descriptor.resourceKey,
    pattern: descriptor.path,
    resourceKey: descriptor.resourceKey,
    label: resolveLabel(descriptor),
    ...(groupKey ? { groupKey, groupLabel: GROUP_LABELS[groupKey] } : {}),
    hideFromNav: Boolean(descriptor.hideFromNav),
    identityParams: meta.identityParams ?? [],
    queryKeys: meta.queryKeys ?? [],
    descriptor,
  }
}

export const jianshenWorkbenchRoutes: readonly JianshenWorkbenchRoute[] =
  applicationRouteDescriptors.map(toWorkbenchRoute)

export const canAccessJianshenRoute = (
  snapshot: PermissionSnapshot | null,
  binding: PermissionSnapshotBinding | null,
  route: JianshenWorkbenchRoute,
): boolean => isRouteAllowed(snapshot, binding, route.descriptor)

const collectVisiblePageKeys = (
  nodes: ReturnType<typeof localResourceRegistry.navigation>,
  keys: Set<string>,
): void => {
  for (const node of nodes) {
    if (node.target.hidden === 'true') continue
    if (node.type === 'PAGE' && typeof node.target.route === 'string') {
      keys.add(node.key)
    }
    collectVisiblePageKeys(node.children, keys)
  }
}

export const buildJianshenCatalogPages = (
  snapshot: PermissionSnapshot | null,
  binding: PermissionSnapshotBinding | null,
): AppPageDescriptor[] => {
  if (!snapshot || !binding) return []
  const visiblePageKeys = new Set<string>()
  collectVisiblePageKeys(localResourceRegistry.navigation(snapshot, binding), visiblePageKeys)

  const descriptors: AppPageDescriptor[] = []
  for (const route of jianshenWorkbenchRoutes) {
    if (route.hideFromNav) continue
    if (!visiblePageKeys.has(route.resourceKey)) continue
    if (!canAccessJianshenRoute(snapshot, binding, route)) continue
    descriptors.push({
      pageId: route.pageId,
      pattern: route.pattern,
      label: route.label,
      ...(route.groupKey ? { groupKey: route.groupKey, groupLabel: route.groupLabel } : {}),
      identityParams: route.identityParams,
      queryKeys: route.queryKeys,
    })
  }
  return descriptors
}

const scorePattern = (pattern: string): number =>
  pattern
    .split('/')
    .filter(Boolean)
    .reduce((score, segment) => score * 10 + (segment.startsWith(':') ? 1 : 2), 0)

const sortedRoutes = [...jianshenWorkbenchRoutes].sort(
  (left, right) => scorePattern(right.pattern) - scorePattern(left.pattern),
)

export interface JianshenRouteMatch {
  readonly route: JianshenWorkbenchRoute
  readonly params: Record<string, string>
}

export const matchJianshenRoute = (pathname: string): JianshenRouteMatch | null => {
  if (!validateRelativeRoutePath(pathname)) return null
  const pathSegments = pathname.split('/').filter(Boolean)

  for (const route of sortedRoutes) {
    const patternSegments = route.pattern.split('/').filter(Boolean)
    if (patternSegments.length !== pathSegments.length) continue
    const params: Record<string, string> = {}
    let matched = true
    for (let i = 0; i < patternSegments.length; i += 1) {
      const patternSegment = patternSegments[i]!
      const actualSegment = pathSegments[i]!
      if (patternSegment.startsWith(':')) {
        try {
          params[patternSegment.slice(1)] = decodeURIComponent(actualSegment)
        } catch {
          matched = false
          break
        }
      } else if (patternSegment !== actualSegment) {
        matched = false
        break
      }
    }
    if (matched) {
      return { route, params }
    }
  }
  return null
}
