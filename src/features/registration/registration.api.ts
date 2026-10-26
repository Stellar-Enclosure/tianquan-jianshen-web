import {catalogScopeKey, isCatalogScope, type CatalogScope} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import type {FeatureApiClient} from '../shared/FeatureApi'
export type {CatalogScope}
export interface ScopeEntry {readonly scope: CatalogScope; readonly applicationId: string; readonly producerCount: number}
export interface ScopePage {readonly scopes: readonly ScopeEntry[]; readonly nextAfterId: string | null}
export interface Producer {readonly producerId: string; readonly kind: string; readonly expectedModules: readonly string[]; readonly producerRevision: string; readonly ownerVersion: string; readonly activeProducerVersion: string | null}
export interface Producers {readonly target: CatalogScope; readonly activeRevision: string; readonly producers: readonly Producer[]}
export interface ManifestDigests {readonly policyDigest: string; readonly metadataDigest: string; readonly manifestDigest: string}
export interface Candidate {readonly producerVersion: string; readonly digests: ManifestDigests; readonly state: string; readonly failureCode: string | null;
  readonly sourceOperationId: string; readonly repository: string; readonly commit: string; readonly buildId: string; readonly artifactVersion: string;
  readonly createdAt: string; readonly qualification: {readonly qualificationId: string; readonly artifactDigest: string; readonly deploymentId: string; readonly expiresAt: string} | null}
export interface Candidates {readonly target: CatalogScope; readonly producerId: string; readonly activeRevision: string; readonly producerRevision: string;
  readonly candidates: readonly Candidate[]; readonly nextBeforeVersion: string | null}
export interface DiffEntry {readonly kind: string; readonly domain: string; readonly key: string; readonly reason: string; readonly authorizationExpansion: boolean}
export interface ManifestDiff {readonly target: CatalogScope; readonly producerId: string; readonly producerVersion: string; readonly expectedActiveRevision: string;
  readonly digests: ManifestDigests; readonly diff: {readonly entries: readonly DiffEntry[]; readonly authorizationExpansion: boolean; readonly conflicts: readonly string[]; readonly absenceCompared: boolean}}
export type DefinitionKind = 'RESOURCE' | 'PERMISSION'
export interface Definition {readonly activeProducerVersion: string | null; readonly id: string; readonly key: string; readonly producerId: string; readonly state: string; readonly version: string; readonly type: string | null; readonly meaning: string | null}
export interface Definitions {readonly target: CatalogScope; readonly kind: DefinitionKind; readonly definitions: readonly Definition[]; readonly nextAfterId: string | null}
export interface DefinitionDetail {readonly identity: Definition; readonly activeProducerVersion: string | null; readonly activeDefinition: Readonly<Record<string, unknown>> | null}
export interface GovernanceCommand {readonly target: CatalogScope; readonly kind: DefinitionKind; readonly identityId: string; readonly action: 'DISABLE' | 'RETIRE' | 'TRANSFER'; readonly expectedVersion: string; readonly targetProducerId?: string}
export interface ActivationSelection {readonly producerId: string; readonly producerVersion: string; readonly qualificationId: string}
export interface ActivationCommand {readonly target: CatalogScope; readonly operationId: string; readonly expectedActiveRevision: string; readonly producers: readonly ActivationSelection[]}
export interface ActivationDescriptor {readonly scope: CatalogScope; readonly activationVersion: string; readonly operationId: string; readonly policyVersion: string; readonly createdAt: string;
  readonly producers: readonly (ActivationSelection & {readonly sourceVersion: string; readonly digests: ManifestDigests; readonly artifactDigest: string})[]}
export interface ActivationHistory {readonly currentRevision: string; readonly versions: readonly ActivationDescriptor[]}

const sameTarget = <T extends {target: CatalogScope}>(target: CatalogScope, response: T): T => {
  if (!isCatalogScope(response.target) || catalogScopeKey(response.target) !== catalogScopeKey(target)) throw new Error('权限目录返回了不同的目标范围')
  return response
}
const checkedActivation = (value: ActivationDescriptor, target: CatalogScope, operationId: string, selection?: readonly ActivationSelection[]) => {
  if (!value || !isCatalogScope(value.scope) || catalogScopeKey(value.scope) !== catalogScopeKey(target) || value.operationId !== operationId
    || !/^[1-9][0-9]{0,18}$/.test(value.activationVersion) || !Array.isArray(value.producers) || value.producers.length === 0) throw new Error('激活回执与原操作不一致')
  if (selection) {
    const members = (values: readonly ActivationSelection[]) => values.map(value => [value.producerId, value.producerVersion, value.qualificationId].join(':')).sort()
    if (JSON.stringify(members(selection)) !== JSON.stringify(members(value.producers))) throw new Error('激活回执与完整生产者集合不一致')
  }
  return value
}
export const registrationApi = (client: FeatureApiClient) => ({
  scopes: async (afterId = '0'): Promise<ScopePage> => {
    const result = await client.request<ScopePage>('/api/v1/permission-catalogs/scopes', {query: {afterId, limit: 100}})
    if (!Array.isArray(result.scopes) || result.scopes.some(value => !isCatalogScope(value.scope))) throw new Error('权限范围响应无效')
    return result
  },
  producers: async (target: CatalogScope) => sameTarget(target, await client.request<Producers>('/api/v1/permission-catalogs/producers', {query: {...target}})),
  candidates: async (target: CatalogScope, producerId: string, beforeVersion = '0') => sameTarget(target, await client.request<Candidates>('/api/v1/permission-catalogs/candidates', {query: {...target, producerId, beforeVersion, limit: 20}})),
  diff: async (target: CatalogScope, producerId: string, producerVersion: string) => sameTarget(target, await client.request<ManifestDiff>('/api/v1/permission-catalogs/diff', {query: {...target, producerId, producerVersion}})),
  definitions: async (target: CatalogScope, kind: DefinitionKind, afterId = '0') => sameTarget(target, await client.request<Definitions>('/api/v1/permission-catalogs/definitions', {query: {...target, kind, afterId, limit: 100}})),
  definition: (target: CatalogScope, kind: DefinitionKind, identityId: string) => client.request<DefinitionDetail>(`/api/v1/permission-catalogs/definitions/${kind}/${encodeURIComponent(identityId)}`, {query: {...target}}),
  govern: (command: GovernanceCommand) => client.request<{target: CatalogScope; kind: DefinitionKind; identity: Definition; policyVersion: string}>('/api/v1/permission-catalogs/governance', {method: 'POST', body: command}),
  activate: async (command: ActivationCommand) => checkedActivation(await client.request<ActivationDescriptor>('/api/v1/permission-catalogs/activations', {method: 'POST', body: command}), command.target, command.operationId, command.producers),
  versions: (target: CatalogScope, beforeVersion = '0') => client.request<ActivationHistory>('/api/v1/permission-catalogs/versions', {query: {...target, beforeVersion, limit: 20}}),
  operation: async (target: CatalogScope, operationId: string) => checkedActivation(await client.request<ActivationDescriptor>('/api/v1/permission-catalogs/versions', {query: {...target, operationId}}), target, operationId),
})
