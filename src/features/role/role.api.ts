import {catalogScopeKey, isCatalogScope, type CatalogScope} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import type { FeatureApiClient } from '../shared/FeatureApi'

export interface RoleView {
  readonly roleId: string
  readonly applicationId: string
  readonly roleCode: string
  readonly roleName: string
  readonly roleType: string
  readonly riskLevel: string
  readonly privileged: boolean
  readonly status: string
  readonly version: number
}

export interface RoleImpactView {
  readonly roleId: string
  readonly activationRoots: readonly string[]
  readonly roleFamily: readonly string[]
  readonly effectiveFamilyRisk: string
  readonly permissionCount: number
  readonly conflicts: readonly string[]
}

export interface RoleMutationResult {
  readonly resourceId: string
  readonly policyVersion: number
  readonly propagationId: string
  readonly propagationPending: boolean
}

export interface RolePermissionGrantView {
  readonly target: CatalogScope
  readonly roleId: string
  readonly version: string
  readonly catalogVersion: string
  readonly permissions: readonly {permissionCode: string; validFrom: string; validTo: string | null}[]
}
export interface ReplaceRolePermissionsCommand {
  readonly target: CatalogScope
  readonly permissionCodes: readonly string[]
  readonly expectedVersion: string
  readonly validFrom: string | null
  readonly validTo: string | null
}

export interface CreateRoleCommand {
  readonly applicationId: string
  readonly roleCode: string
  readonly roleName: string
  readonly roleType: string
  readonly riskLevel: string
  readonly privileged: boolean
  readonly landingRouteId: string | null
  readonly landingPriority: number
  readonly maximumAssignmentDays: number | null
}

export interface UpdateRoleCommand {
  readonly roleName: string
  readonly status: string
  readonly landingRouteId: string | null
  readonly landingPriority: number
  readonly maximumAssignmentDays: number | null
  readonly expectedRoleVersion: number
}

export interface InheritanceCommand {
  readonly applicationId: string
  readonly juniorRoleId: string
  readonly expectedRoleVersion: number
}

export const roleApi = (client: FeatureApiClient) => ({
  roles: (applicationId?: string) => client.request<readonly RoleView[]>(
    '/api/tianquan-jianshen/v1/iam/roles',
    { query: { applicationId } },
  ),
  create: (command: CreateRoleCommand) => client.request<RoleMutationResult>(
    '/api/tianquan-jianshen/v1/iam/roles',
    { method: 'POST', body: command },
  ),
  update: (roleId: string, command: UpdateRoleCommand) => client.request<RoleMutationResult>(
    `/api/tianquan-jianshen/v1/iam/roles/${encodeURIComponent(roleId)}`,
    { method: 'PUT', body: command },
  ),
  addInheritance: (roleId: string, command: InheritanceCommand) => client.request<RoleImpactView>(
    `/api/tianquan-jianshen/v1/iam/roles/${encodeURIComponent(roleId)}/inheritances`,
    { method: 'POST', body: command },
  ),
  removeInheritance: (
    roleId: string,
    juniorRoleId: string,
    query: { applicationId: string; expectedRoleVersion: number },
  ) => client.request<RoleImpactView>(
    `/api/tianquan-jianshen/v1/iam/roles/${encodeURIComponent(roleId)}/inheritances/${encodeURIComponent(juniorRoleId)}`,
    { method: 'DELETE', query },
  ),
  impact: (roleId: string) => client.request<RoleImpactView>(
    `/api/tianquan-jianshen/v1/iam/roles/${encodeURIComponent(roleId)}/impact-analysis`,
  ),
  permissions: async (roleId: string, target: CatalogScope) => {
    const value = await client.request<RolePermissionGrantView>(`/api/v1/roles/${encodeURIComponent(roleId)}/permissions`, {query: {...target}})
    if (value.roleId !== roleId || !isCatalogScope(value.target) || catalogScopeKey(value.target) !== catalogScopeKey(target)) throw new Error('角色授予响应与当前范围不一致')
    return value
  },
  replacePermissions: (roleId: string, command: ReplaceRolePermissionsCommand) => client.request<{
    target: CatalogScope; roleId: string; version: string; policyVersion: string; permissionCodes: readonly string[]; addedCount: number; removedCount: number;
  }>(`/api/v1/roles/${encodeURIComponent(roleId)}/permissions`, {method: 'PUT', body: command}),
})
