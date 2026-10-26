import {cleanup, renderHook} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {PropsWithChildren} from 'react'
import {snapshotContext, type BackendFieldCatalog, type PermissionSnapshot} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {inputFields} from './fieldReferences'
const state = vi.hoisted(() => ({status: 'READY', snapshot: undefined as PermissionSnapshot | undefined, binding: undefined as ReturnType<typeof snapshotContext> | undefined}))
vi.mock('@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk', () => ({useRbac3Authorization: () => state}))
import {FieldCatalogContext, useWritableFields} from './FieldCatalog'
afterEach(() => {cleanup(); state.snapshot = undefined; state.binding = undefined})
const setup = (): BackendFieldCatalog => {
  state.snapshot = {issuer: 'https://identity.example/tenants/42', subject: 'user', catalogScope: {catalogScopeId: '101', tenantId: '42', businessCode: 'xingyuan', applicationCode: 'tianquan-jianshen', namespaceCode: 'default', environment: 'test'}, catalogVersion: '1', authVersion: '1', policyVersion: '1', activeRoleContext: {applicationCode: 'tianquan-jianshen', rootRoleIds: ['1'], effectiveRoleIds: ['1']}, permissionCodes: ['system:role-permission:manage'], snapshotExpiresAt: new Date(Date.now() + 60_000).toISOString()}
  state.binding = snapshotContext(state.snapshot, 0)
  return {catalogScope: state.snapshot.catalogScope, catalogVersion: '1', fields: Object.fromEntries(inputFields.ReplaceRolePermissionsRequestDTO.map(key => [key, {access: 'PROTECTED', inputBinding: true, fieldPolicy: {valueType: 'STRING', write: {mode: 'ALL', codes: ['system:role-permission:manage']}}}]))}
}
const wrapper = (catalog: BackendFieldCatalog | null) => ({children}: PropsWithChildren) => <FieldCatalogContext.Provider value={catalog}>{children}</FieldCatalogContext.Provider>
describe('backend FIELD projection gates', () => {
  it('permits a complete role grant only with every submitted field bound and writable', () => {
    const catalog = setup()
    expect(renderHook(() => useWritableFields('ReplaceRolePermissionsRequestDTO'), {wrapper: wrapper(catalog)}).result.current).toBe(true)
    const key = inputFields.ReplaceRolePermissionsRequestDTO[0]
    expect(renderHook(() => useWritableFields('ReplaceRolePermissionsRequestDTO'), {wrapper: wrapper({...catalog, fields: {...catalog.fields, [key]: {...catalog.fields[key], inputBinding: false}}})}).result.current).toBe(false)
  })
  it('fails closed for missing metadata, stale catalog or missing actor write permission', () => {
    const catalog = setup()
    expect(renderHook(() => useWritableFields('ReplaceRolePermissionsRequestDTO'), {wrapper: wrapper(null)}).result.current).toBe(false)
    expect(renderHook(() => useWritableFields('ReplaceRolePermissionsRequestDTO'), {wrapper: wrapper({...catalog, catalogVersion: '2'})}).result.current).toBe(false)
    state.snapshot = {...state.snapshot!, permissionCodes: []}
    expect(renderHook(() => useWritableFields('ReplaceRolePermissionsRequestDTO'), {wrapper: wrapper(catalog)}).result.current).toBe(false)
  })
})
