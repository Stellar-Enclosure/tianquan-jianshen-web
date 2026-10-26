import type { FeatureRouteDescriptor } from './shared/RouteDescriptor'
import { AuditLogPage } from './audit/AuditLogPage'
import { RuntimeStatusPage } from './runtime/RuntimeStatusPage'
import { AuthorizationSimulationPage } from './simulation/AuthorizationSimulationPage'

export const runtimeRouteDescriptors: readonly FeatureRouteDescriptor[] = [
  { key: 'simulation', path: '/iam/diagnostics/simulation', title: '授权模拟', resourceKey: 'tianquan-jianshen.page.simulation', componentKey: 'tianquan-jianshen-simulation', component: AuthorizationSimulationPage, navigationOrder: 80 },
  { key: 'audit', path: '/iam/diagnostics/audit', title: '授权审计', resourceKey: 'tianquan-jianshen.page.audit', componentKey: 'tianquan-jianshen-audit', component: AuditLogPage, navigationOrder: 81 },
  { key: 'runtime', path: '/iam/diagnostics/runtime', title: '运行状态', resourceKey: 'tianquan-jianshen.page.runtime', componentKey: 'tianquan-jianshen-runtime', component: RuntimeStatusPage, navigationOrder: 82 },
] as const
