import {useParams} from 'react-router-dom'
import type {FeatureRouteDescriptor} from './shared/RouteDescriptor'
import {AssignmentListPage} from './assignment/AssignmentListPage'
import {ManagementPolicyPage} from './management-policy/ManagementPolicyPage'
import {RoleActivationPage} from './role-activation/RoleActivationPage'

const AssignmentRoute = () => <AssignmentListPage userId={useParams().userId ?? ''} />

export const authorizationRouteDescriptors: readonly FeatureRouteDescriptor[] = [
  { key: 'assignments', path: '/iam/users/:userId/role-assignments', title: '角色任职', resourceKey: 'tianquan-jianshen.page.assignments', componentKey: 'tianquan-jianshen-assignments', component: AssignmentRoute, navigationOrder: 70, hideFromNav: true },
  { key: 'management-policies', path: '/iam/management-policies', title: '委托策略', resourceKey: 'tianquan-jianshen.page.management-policies', componentKey: 'tianquan-jianshen-management-policies', component: ManagementPolicyPage, navigationOrder: 71 },
  { key: 'role-activation', path: '/iam/role-activation', title: '激活角色', resourceKey: 'tianquan-jianshen.page.role-activation', componentKey: 'tianquan-jianshen-role-activation', component: RoleActivationPage, navigationOrder: 72 },
] as const
