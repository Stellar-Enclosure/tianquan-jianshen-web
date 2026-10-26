import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import type {PropsWithChildren} from 'react'
import {MemoryRouter} from 'react-router-dom'
import {vi} from 'vitest'
import {FeatureApiProvider, type FeatureApiClient, type FeatureApiRequest} from '../features/shared/FeatureApi'
import {createAuthorizationFixtureClient, permissionSnapshotFixture, TestAuthorizationProvider} from './authorization'
import type {ActivationDescriptor, Candidate, Definition, ManifestDiff} from '../features/registration/registration.api'
export const target = permissionSnapshotFixture().catalogScope
export const codes = ['system:permission-catalog:read', 'system:permission-catalog:manage', 'system:permission-catalog:activate', 'system:role-permission:read', 'system:role-permission:manage']
export const definition: Definition = {id: '201', key: 'order:read', producerId: 'java/api', state: 'ACTIVE', version: '4', type: null, meaning: '读取订单', activeProducerVersion: '1'}
export const digests = {policyDigest: 'a'.repeat(64), metadataDigest: 'b'.repeat(64), manifestDigest: 'c'.repeat(64)}
export const candidate = (version = '1'): Candidate => ({producerVersion: version, digests, state: 'READY', failureCode: null, sourceOperationId: 'source-op', repository: 'repo', commit: 'a'.repeat(40), buildId: 'build-1', artifactVersion: '0.0.1', createdAt: '2026-10-25T00:00:00Z', qualification: {qualificationId: '501', artifactDigest: 'd'.repeat(64), deploymentId: 'deployment-1', expiresAt: new Date(Date.now() + 60_000).toISOString()}})
export const diff = (producerId = 'java/api', expansion = false): ManifestDiff => ({target, producerId, producerVersion: '1', expectedActiveRevision: '2', digests,
  diff: {entries: [{kind: 'CHANGED', domain: 'RESOURCE', key: 'order.api.list', reason: expansion ? 'ALL_TO_ANY' : 'METADATA_ONLY', authorizationExpansion: expansion}], authorizationExpansion: expansion, conflicts: [], absenceCompared: true}})
export const descriptor = (operationId: string): ActivationDescriptor => ({scope: target, activationVersion: '3', operationId, policyVersion: '5', createdAt: '2026-10-25T00:00:00Z', producers: ['java/api', 'react-web'].map(producerId => ({producerId, producerVersion: '1', qualificationId: '501', sourceVersion: digests.manifestDigest, digests, artifactDigest: 'd'.repeat(64)}))})
export const defaultCatalogResponse = (path: string, options: FeatureApiRequest = {}): unknown => {
  if (path.endsWith('/scopes')) return {scopes: [{scope: target, applicationId: '71', producerCount: 2}], nextAfterId: null}
  if (path.endsWith('/producers')) return {target, activeRevision: '2', producers: ['java/api', 'react-web'].map(producerId => ({producerId, kind: 'JAVA', expectedModules: ['main'], producerRevision: '1', ownerVersion: '1', activeProducerVersion: '1'}))}
  if (path.endsWith('/candidates')) return {target, producerId: options.query?.producerId, activeRevision: '2', producerRevision: '1', candidates: [candidate()], nextBeforeVersion: null}
  if (path.endsWith('/diff')) return diff(String(options.query?.producerId))
  if (path.endsWith('/definitions')) return {target, kind: options.query?.kind, definitions: [options.query?.kind === 'RESOURCE' ? {...definition, key: 'order.field.email', type: 'FIELD'} : definition], nextAfterId: null}
  if (path.includes('/definitions/')) return {identity: definition, activeProducerVersion: '1', activeDefinition: {code: 'order:read', meaning: '读取订单', requirement: {mode: 'ALL', codes: ['order:read']}}}
  if (path.endsWith('/versions')) return {currentRevision: '2', versions: []}
  if (path === '/api/tianquan-jianshen/v1/iam/roles') return [{roleId: '301', applicationId: '71', roleCode: 'EDITOR', roleName: '订单编辑', status: 'ACTIVE'}]
  if (path === '/api/v1/roles/301/permissions') return {target, roleId: '301', version: '7', catalogVersion: '1', permissions: []}
  throw new Error('Unexpected fixture endpoint: ' + path)
}
export const catalogWrapper = (respond: (path: string, options: FeatureApiRequest) => unknown = defaultCatalogResponse, permissionCodes = codes) => {
  const request = vi.fn(async <T,>(path: string, options: FeatureApiRequest = {}): Promise<T> => await respond(path, options) as T) as unknown as FeatureApiClient['request']
  const refresh = vi.fn(async () => undefined)
  const client = createAuthorizationFixtureClient({permissionCodes})
  const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}})
  const Wrapper = ({children}: PropsWithChildren) => <QueryClientProvider client={queryClient}><TestAuthorizationProvider client={client} onRefresh={refresh}>
    <FeatureApiProvider client={{request}}><MemoryRouter>{children}</MemoryRouter></FeatureApiProvider></TestAuthorizationProvider></QueryClientProvider>
  return {wrapper: Wrapper, request, refresh, queryClient}
}
