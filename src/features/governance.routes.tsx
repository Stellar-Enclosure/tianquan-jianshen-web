import {ManifestVersionsPage} from './registration/ManifestVersionsPage'
import {ManifestDiffPage} from './registration/ManifestDiffPage'
import { Navigate, useParams } from 'react-router-dom'
import type { FeatureRouteDescriptor } from './shared/RouteDescriptor'
import { OverviewPage } from './overview/OverviewPage'
import { UserDirectoryPage } from './directory/UserDirectoryPage'
import { ApplicationListPage } from './application/ApplicationListPage'
import { ResourceCatalogPage } from './application/ResourceCatalogPage'
import { FieldDefinitionPage } from './application/FieldDefinitionPage'
import { RoleGraphPage } from './role/RoleGraphPage'
import { RolePermissionGrantPage } from './role/RolePermissionGrantPage'
import { ConstraintPage } from './constraint/ConstraintPage'
import { OrganizationPage } from './directory/OrganizationPage'
import { PositionPage } from './directory/PositionPage'
import { PermissionCatalogPage } from './permission/PermissionCatalogPage'
import { BusinessCatalogPage } from './business/BusinessCatalogPage'

const RolePermissionRoute = () => {
  const { roleId } = useParams()
  return roleId ? <RolePermissionGrantPage roleId={roleId} /> : <Navigate to="/iam/roles" replace />
}

export const governanceRouteDescriptors: readonly FeatureRouteDescriptor[] = [
  { key: 'overview', path: '/iam/overview', title: '治理概览', resourceKey: 'tianquan-jianshen.page.overview', componentKey: 'tianquan-jianshen-overview', component: OverviewPage, navigationOrder: 10 },
  { key: 'directory-users', path: '/iam/users', title: '用户目录', resourceKey: 'tianquan-jianshen.page.directory-users', componentKey: 'tianquan-jianshen-users', component: UserDirectoryPage, navigationOrder: 30 },
  { key: 'directory-organizations', path: '/iam/organizations', title: '组织', resourceKey: 'tianquan-jianshen.page.directory-organizations', componentKey: 'tianquan-jianshen-organizations', component: OrganizationPage, navigationOrder: 31 },
  { key: 'directory-positions', path: '/iam/positions', title: '岗位', resourceKey: 'tianquan-jianshen.page.directory-positions', componentKey: 'tianquan-jianshen-positions', component: PositionPage, navigationOrder: 32 },
  { key: 'tenant-applications', path: '/iam/tenant-applications', title: '租户应用', resourceKey: 'tianquan-jianshen.page.tenant-applications', componentKey: 'tianquan-jianshen-tenant-applications', component: ApplicationListPage, navigationOrder: 40 },
  { key: 'resources', path: '/iam/resources', title: '资源目录', resourceKey: 'tianquan-jianshen.page.resources', componentKey: 'tianquan-jianshen-resources', component: ResourceCatalogPage, navigationOrder: 41 },
  { key: 'fields', path: '/iam/fields', title: '字段定义', resourceKey: 'tianquan-jianshen.page.fields', componentKey: 'tianquan-jianshen-fields', component: FieldDefinitionPage, navigationOrder: 42 },
  { key: 'permissions', path: '/iam/permissions', title: '权限', resourceKey: 'tianquan-jianshen.page.permissions', componentKey: 'tianquan-jianshen-permissions', component: PermissionCatalogPage, navigationOrder: 43 },
  { key: 'business-catalog', path: '/iam/businesses', title: '业务目录', resourceKey: 'tianquan-jianshen.page.business-catalog', componentKey: 'tianquan-jianshen-business-catalog', component: BusinessCatalogPage, navigationOrder: 44 },
  { key: 'roles', path: '/iam/roles', title: '角色图谱', resourceKey: 'tianquan-jianshen.page.roles', componentKey: 'tianquan-jianshen-role-graph', component: RoleGraphPage, navigationOrder: 50 },
  { key: 'role-permissions', path: '/iam/roles/:roleId/permissions', title: '角色权限字符', resourceKey: 'tianquan-jianshen.page.role-permissions', componentKey: 'tianquan-jianshen-role-permissions', component: RolePermissionRoute, navigationOrder: 51, hideFromNav: true },
  { key: 'constraints', path: '/iam/policies', title: '授权约束', resourceKey: 'tianquan-jianshen.page.constraints', componentKey: 'tianquan-jianshen-constraints', component: ConstraintPage, navigationOrder: 60 },
  { key: 'manifest-versions', path: '/iam/manifests', title: '候选与激活', resourceKey: 'tianquan-jianshen.page.manifest-versions', componentKey: 'tianquan-jianshen-manifests', component: ManifestVersionsPage, navigationOrder: 45 },
  { key: 'manifest-diff', path: '/iam/manifest-diff', title: 'Manifest 差异', resourceKey: 'tianquan-jianshen.page.manifest-diff', componentKey: 'tianquan-jianshen-manifest-diff', component: ManifestDiffPage, navigationOrder: 46 },
] as const
