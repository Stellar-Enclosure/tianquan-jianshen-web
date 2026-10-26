import {useMemo, type PropsWithChildren} from 'react'
import {Rbac3Provider, type Rbac3Client} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {AuthRequestContext} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {snapshotContext, type PermissionSnapshot} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {CurrentAuthorizationRefreshContext} from '../features/auth/CurrentAuthorizationProvider'
import {resources, resourceReferences} from '../permissions/resources'

export interface AuthorizationFacts {readonly subject?: string; readonly tenantId?: string; readonly permissionCodes?: readonly string[]; readonly authVersion?: number; readonly policyVersion?: number}
export const permissionSnapshotFixture = (facts: AuthorizationFacts = {}): PermissionSnapshot => ({
  issuer: 'https://identity.example/tenants/' + (facts.tenantId ?? '42'), subject: facts.subject ?? 'fixture-user',
  catalogScope: {catalogScopeId: '101', tenantId: facts.tenantId ?? '42', businessCode: 'xingyuan', applicationCode: 'tianquan-jianshen', namespaceCode: 'default', environment: 'test'},
  catalogVersion: '1', authVersion: String(facts.authVersion ?? 1), policyVersion: String(facts.policyVersion ?? 1),
  activeRoleContext: {applicationCode: 'tianquan-jianshen', rootRoleIds: ['1'], effectiveRoleIds: ['1']},
  permissionCodes: facts.permissionCodes ?? [], snapshotExpiresAt: new Date(Date.now() + 60_000).toISOString(),
})
interface FixtureClient extends Rbac3Client {readonly fixtureSnapshot: PermissionSnapshot}
export const createAuthorizationFixtureClient = (facts: AuthorizationFacts = {}, overrides: Partial<Rbac3Client> = {}): FixtureClient => {
  const fixtureSnapshot = permissionSnapshotFixture(facts)
  return {fixtureSnapshot,
    getAbout: async () => ({user: {subject: fixtureSnapshot.subject, tenantId: fixtureSnapshot.catalogScope.tenantId, status: 'ACTIVE'},
      currentApplicationCode: 'tianquan-jianshen', activeRoles: [], landingRouteCode: null, authVersion: facts.authVersion ?? 1, policyVersion: facts.policyVersion ?? 1}),
    getPermissionSnapshot: async () => fixtureSnapshot,
    getActivationCandidates: async () => {throw new Error('No activation candidates fixture')},
    getActiveRoles: async () => {throw new Error('No active roles fixture')},
    replaceActiveRoles: async () => {throw new Error('No activation mutation fixture')}, ...overrides}
}
const noRefresh = async () => undefined
/** Feature tests use the installed Provider with an explicit new-wire snapshot and context. */
export const TestAuthorizationProvider = ({client, children, onRefresh = noRefresh}: PropsWithChildren<{client: Rbac3Client; onRefresh?: () => Promise<void>}>) => {
  const context = useMemo(() => new AuthRequestContext(), [])
  const snapshot = useMemo(() => 'fixtureSnapshot' in client ? (client as FixtureClient).fixtureSnapshot : permissionSnapshotFixture(), [client])
  const sdk = useMemo(() => ({...client, getPermissionSnapshot: client.getPermissionSnapshot ?? (async () => snapshot)}), [client, snapshot])
  const binding = useMemo(() => snapshotContext(snapshot, context.epoch), [snapshot, context])
  return <CurrentAuthorizationRefreshContext.Provider value={onRefresh}><Rbac3Provider client={sdk} binding={binding} requestContext={context}
    resources={resources} resourceReferences={resourceReferences}>{children}</Rbac3Provider></CurrentAuthorizationRefreshContext.Provider>
}
