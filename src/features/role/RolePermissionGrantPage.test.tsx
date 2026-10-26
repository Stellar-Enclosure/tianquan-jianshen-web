vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {ApiError} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {RolePermissionGrantPage} from './RolePermissionGrantPage'
import {catalogWrapper, defaultCatalogResponse, definition, target} from '../../test/catalog'
afterEach(cleanup)

describe('explicit role permission grants', () => {
  it('sends permission characters and a scope-local decimal version without resource ids', async () => {
    const test = catalogWrapper((path, options) => options.method === 'PUT' ? {version: '8', permissionCodes: ['order:read']} : defaultCatalogResponse(path, options))
    render(<RolePermissionGrantPage roleId="301" />, test)
    fireEvent.click(await screen.findByRole('checkbox', {name: /order:read/}))
    fireEvent.click(screen.getByRole('button', {name: '保存权限字符'}))
    await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/roles/301/permissions', {method: 'PUT', body: {
      target, permissionCodes: ['order:read'], expectedVersion: '7', validFrom: null, validTo: null,
    }}))
    await waitFor(() => expect(test.refresh).toHaveBeenCalledOnce())
  })
  it('does not offer identities that are absent from the current activation', async () => {
    const test = catalogWrapper((path, options) => path.endsWith('/definitions')
      ? {target, kind: 'PERMISSION', definitions: [{...definition, activeProducerVersion: null}], nextAfterId: null} : defaultCatalogResponse(path, options))
    render(<RolePermissionGrantPage roleId="301" />, test)
    await screen.findByText('角色权限字符 · 订单编辑')
    await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/permission-catalogs/definitions', expect.anything()))
    expect(screen.queryByRole('checkbox', {name: /order:read/})).toBeNull()
  })
  it('permits an explicit empty replacement to clear direct grants', async () => {
    const test = catalogWrapper((path, options) => path === '/api/v1/roles/301/permissions'
      ? options.method === 'PUT' ? {version: '8', permissionCodes: []} : {target, roleId: '301', version: '7', catalogVersion: '1', permissions: [{permissionCode: 'order:read', validFrom: '2026-01-01T00:00:00Z', validTo: null}]}
      : defaultCatalogResponse(path, options))
    render(<RolePermissionGrantPage roleId="301" />, test)
    const checkbox = await screen.findByRole('checkbox', {name: /order:read/})
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole('button', {name: '保存权限字符'}))
    await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/roles/301/permissions', expect.objectContaining({method: 'PUT', body: expect.objectContaining({permissionCodes: []})})))
  })
  it('retains a conflict draft but prevents silently overwriting the reloaded version', async () => {
    let version = '7'
    const test = catalogWrapper((path, options) => {
      if (path === '/api/v1/roles/301/permissions') {
        if (options.method === 'PUT') {version = '8'; throw new ApiError('revision changed', 409, 'AUTH_MUTATION_CONFLICT')}
        return {target, roleId: '301', version, catalogVersion: '1', permissions: []}
      }
      return defaultCatalogResponse(path, options)
    })
    render(<RolePermissionGrantPage roleId="301" />, test)
    fireEvent.click(await screen.findByRole('checkbox', {name: /order:read/}))
    fireEvent.click(screen.getByRole('button', {name: '保存权限字符'}))
    await screen.findByText('版本已变化，草稿未自动覆盖新版本')
    expect(screen.getByRole('button', {name: '保存权限字符'})).toBeDisabled()
    expect(screen.getByRole('checkbox', {name: /order:read/})).toBeChecked()
    expect(test.refresh).not.toHaveBeenCalled()
  })
})

it('preserves an existing scheduled validity window when another permission is selected', async () => {
  const validFrom = '2030-01-02T03:04:05.123456Z'
  const validTo = '2031-01-02T03:04:05.123456Z'
  const test = catalogWrapper((path, options) => {
    if (path.endsWith('/definitions')) return {target, kind: 'PERMISSION', definitions: [definition, {...definition, id: '202', key: 'order:write'}], nextAfterId: null}
    if (path === '/api/v1/roles/301/permissions') return options.method === 'PUT' ? {version: '8'} : {target, roleId: '301', version: '7', catalogVersion: '1', permissions: [{permissionCode: 'order:read', validFrom, validTo}]}
    return defaultCatalogResponse(path, options)
  })
  render(<RolePermissionGrantPage roleId="301" />, test)
  fireEvent.click(await screen.findByRole('checkbox', {name: /order:write/}))
  fireEvent.click(screen.getByRole('button', {name: '保存权限字符'}))
  await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/roles/301/permissions', {method: 'PUT', body: {
    target, permissionCodes: ['order:read', 'order:write'], expectedVersion: '7', validFrom, validTo,
  }}))
})

it('requires explicit confirmation before replacing heterogeneous existing validity windows', async () => {
  const test = catalogWrapper((path, options) => {
    if (path.endsWith('/definitions')) return {target, kind: 'PERMISSION', definitions: [definition, {...definition, id: '202', key: 'order:write'}], nextAfterId: null}
    if (path === '/api/v1/roles/301/permissions') return {target, roleId: '301', version: '7', catalogVersion: '1', permissions: [
      {permissionCode: 'order:read', validFrom: '2030-01-01T00:00:00Z', validTo: '2031-01-01T00:00:00Z'},
      {permissionCode: 'order:write', validFrom: '2032-01-01T00:00:00Z', validTo: null},
    ]}
    return defaultCatalogResponse(path, options)
  })
  render(<RolePermissionGrantPage roleId="301" />, test)
  await screen.findByText('现有权限使用不同有效期')
  fireEvent.click(screen.getByRole('checkbox', {name: /order:write/}))
  expect(screen.getByRole('button', {name: '保存权限字符'})).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', {name: /我确认用上述统一有效期/}))
  expect(screen.getByRole('button', {name: '保存权限字符'})).toBeEnabled()
})
