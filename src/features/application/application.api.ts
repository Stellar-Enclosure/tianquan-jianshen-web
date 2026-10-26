import type { FeatureApiClient } from '../shared/FeatureApi'

export interface TenantApplicationView {
  readonly applicationId: string
  readonly ddcBusinessId: string
  readonly ddcApplicationId: string
  readonly businessCode: string
  readonly applicationCode: string
  readonly applicationName: string
  readonly status: string
  readonly displayPriority: number
  readonly version: number
}

export const applicationApi = (client: FeatureApiClient) => ({
  tenantApplications: () => client.request<readonly TenantApplicationView[]>('/api/tianquan-jianshen/v1/iam/tenant-applications'),
  application: (applicationId: string) => client.request<TenantApplicationView>(
    `/api/tianquan-jianshen/v1/iam/tenant-applications/${encodeURIComponent(applicationId)}`,
  ),
  admitTenantApplication: (ddcApplicationId: string, displayPriority: number) => client.request<TenantApplicationView>(
    '/api/tianquan-jianshen/v1/iam/tenant-applications',
    { method: 'POST', body: { ddcApplicationId, displayPriority } },
  ),
  changeTenantApplicationStatus: (applicationId: string, status: string, expectedVersion: number) => client.request<TenantApplicationView>(
    `/api/tianquan-jianshen/v1/iam/tenant-applications/${encodeURIComponent(applicationId)}/status`,
    { method: 'PUT', body: { status, expectedVersion } },
  ),
  removeTenantApplication: (applicationId: string, expectedVersion: number) => client.request<null>(
    `/api/tianquan-jianshen/v1/iam/tenant-applications/${encodeURIComponent(applicationId)}`,
    { method: 'DELETE', query: { expectedVersion } },
  ),
  applications: () => client.request<readonly TenantApplicationView[]>('/api/tianquan-jianshen/v1/iam/tenant-applications'),
})
